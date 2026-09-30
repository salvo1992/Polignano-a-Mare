const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

function load(relativePath, dependencies = {}) {
  const filename = path.join(__dirname, '..', relativePath)
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const module = { exports: {} }
  vm.runInNewContext(source, {
    module, exports: module.exports, process: { env: {} },
    require: name => {
      if (name === 'server-only') return {}
      if (Object.hasOwn(dependencies, name)) return dependencies[name]
      throw new Error(`Unexpected dependency: ${name}`)
    },
  }, { filename })
  return module.exports
}
const { getStorageDiagnostics } = load('lib/storage-diagnostics.ts')

test('missing variables and a standalone Vercel OIDC token do not imply Blob is configured', () => {
  for (const env of [{}, { VERCEL_OIDC_TOKEN: 'test-only-oidc' }]) {
    const result = getStorageDiagnostics(env)
    assert.equal(result.blob.configuration, 'not_configured')
    assert.equal(result.firebase.bucketConfigured, false)
    assert.equal(result.uploadProvider, 'firebase-storage')
    assert.equal(result.blob.accessVerified, false)
    assert.equal(result.blob.uploadVerified, false)
  }
})

test('detects token, incomplete OIDC and complete OIDC with SDK credential precedence', () => {
  assert.equal(getStorageDiagnostics({ BLOB_READ_WRITE_TOKEN: 'test-token' }).blob.configuration, 'read_write_token')
  assert.equal(getStorageDiagnostics({ BLOB_STORE_ID: 'test-store' }).blob.configuration, 'incomplete')
  assert.equal(getStorageDiagnostics({ BLOB_STORE_ID: 'test-store', BLOB_READ_WRITE_TOKEN: 'test-token' }).blob.configuration, 'read_write_token')
  assert.equal(getStorageDiagnostics({ BLOB_STORE_ID: 'test-store', VERCEL_OIDC_TOKEN: 'test-oidc', BLOB_READ_WRITE_TOKEN: 'test-token' }).blob.configuration, 'oidc')
})

test('detects Firebase configuration source without claiming the bucket exists', () => {
  assert.equal(getStorageDiagnostics({ NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'test-public-bucket' }).firebase.bucketSource, 'public')
  assert.equal(getStorageDiagnostics({ FIREBASE_STORAGE_BUCKET: 'test-server-bucket', NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'test-public-bucket' }).firebase.bucketSource, 'server')
  const result = getStorageDiagnostics({ BLOB_READ_WRITE_TOKEN: '  ', BLOB_STORE_ID: '', FIREBASE_STORAGE_BUCKET: ' ' })
  assert.equal(result.blob.configuration, 'not_configured')
  assert.equal(result.firebase.bucketSource, 'missing')
})

test('never reads unrelated credentials or serializes values, including identifiers', () => {
  const env = {
    BLOB_READ_WRITE_TOKEN: 'sensitive-test-token', BLOB_STORE_ID: 'sensitive-test-store',
    VERCEL_OIDC_TOKEN: 'sensitive-test-oidc', FIREBASE_STORAGE_BUCKET: 'sensitive-test-bucket',
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'sensitive-test-public-bucket',
    get FIREBASE_PRIVATE_KEY() { throw new Error('Must not read unrelated secrets') },
  }
  const serialized = JSON.stringify(getStorageDiagnostics(env))
  assert.equal(serialized.includes('sensitive-test'), false)
  assert.equal(serialized.includes('FIREBASE_PRIVATE_KEY'), false)
})

function routeHarness({ role = 'admin', invalidToken = false, databaseFailure = false } = {}) {
  const calls = { verify: 0, role: 0, diagnostics: 0 }
  const auth = load('lib/admin-api-auth.ts', {
    '@/lib/firebase-admin': {
      getAdminAuth: () => ({ verifyIdToken: async () => {
        calls.verify++
        if (invalidToken) throw new Error('sensitive-test-auth-error')
        return { uid: 'test-user' }
      } }),
      getAdminDb: () => ({ collection: () => ({ doc: () => ({ get: async () => {
        calls.role++
        if (databaseFailure) throw new Error('sensitive-test-database-error')
        return { exists: role !== null, data: () => ({ role }) }
      } }) }) }),
    },
  })
  const route = load('app/api/admin/storage-diagnostics/route.ts', {
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
    '@/lib/admin-api-auth': auth,
    '@/lib/storage-diagnostics': { getStorageDiagnostics: () => {
      calls.diagnostics++
      return getStorageDiagnostics({ BLOB_READ_WRITE_TOKEN: 'sensitive-test-token' })
    } },
  })
  return { route, calls }
}
const request = authorization => new Request('https://test.invalid/api/admin/storage-diagnostics', {
  headers: authorization === undefined ? {} : { Authorization: authorization },
})

test('missing, empty, malformed and rejected bearer tokens cannot read configuration', async () => {
  for (const authorization of [undefined, 'Bearer ', 'Basic test', 'Bearer invalid']) {
    const { route, calls } = routeHarness({ invalidToken: true })
    const response = await route.GET(request(authorization))
    assert.equal(response.status, 401)
    assert.equal(calls.diagnostics, 0)
    assert.equal(calls.role, 0)
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store')
    assert.equal((await response.text()).includes('sensitive-test'), false)
  }
})

test('ordinary users and missing role documents cannot read configuration', async () => {
  for (const role of ['guest', 'user', null]) {
    const { route, calls } = routeHarness({ role })
    const response = await route.GET(request('Bearer test-token'))
    assert.equal(response.status, 403)
    assert.equal(calls.diagnostics, 0)
    assert.equal(calls.verify, 1)
    assert.equal(calls.role, 1)
  }
})

test('admin receives only safe configuration states, without caching or writes', async () => {
  const { route, calls } = routeHarness()
  assert.equal(route.dynamic, 'force-dynamic')
  assert.equal(route.runtime, 'nodejs')
  assert.equal(route.POST, undefined)
  assert.equal(route.PUT, undefined)
  const response = await route.GET(request('Bearer test-token'))
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store')
  assert.equal(response.headers.get('Vary'), 'Authorization')
  const result = await response.json()
  assert.equal(result.blob.configuration, 'read_write_token')
  assert.equal(JSON.stringify(result).includes('sensitive-test'), false)
  assert.equal(calls.diagnostics, 1)
})

test('unexpected backend errors do not leak provider messages or configuration', async () => {
  const { route, calls } = routeHarness({ databaseFailure: true })
  const response = await route.GET(request('Bearer test-token'))
  assert.equal(response.status, 503)
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store')
  assert.equal((await response.text()).includes('sensitive-test'), false)
  assert.equal(calls.diagnostics, 0)
})
