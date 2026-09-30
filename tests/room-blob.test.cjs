const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const crypto = require('node:crypto')
const ts = require('typescript')

function loader(mocks = {}, globals = {}) {
  const cache = new Map()
  function load(filename) {
    filename = path.resolve(__dirname, '..', filename)
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }; cache.set(filename, module)
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText
    vm.runInNewContext(source, {
      module, exports: module.exports, Buffer, Request, Response, URL, AbortSignal,
      process: { env: {} }, fetch: () => { throw new Error('Unexpected network access') },
      require: name => {
        if (Object.hasOwn(mocks, name)) return mocks[name]
        if (name === 'server-only') return {}
        if (name.startsWith('node:')) return require(name)
        if (name === 'zod') return require(name)
        if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`)
        if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), `${name}.ts`))
        throw new Error(`Unexpected dependency: ${name}`)
      }, ...globals,
    }, { filename })
    return module.exports
  }
  return load
}

const TOKEN = 'vercel_blob_rw_XCl7resVDboCUh6e_test_only_not_a_real_credential'
const HOST = 'xcl7resvdbocuh6e.public.blob.vercel-storage.com'
const STORE = 'store_XCl7resVDboCUh6e'
const key = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs8', format: 'pem' })

test('credential encryption is randomized, tamper-evident and stable across PEM encodings', () => {
  const { sealBlobToken, unsealBlobToken } = loader()('lib/blob-credential-seal.ts')
  const a = sealBlobToken(TOKEN, key), b = sealBlobToken(TOKEN, key)
  assert.notEqual(a.ciphertext, b.ciphertext)
  assert.equal(JSON.stringify(a).includes(TOKEN), false)
  for (const encoding of [key, JSON.stringify(key), Buffer.from(key).toString('base64')]) assert.equal(unsealBlobToken(a, encoding), TOKEN)
  assert.throws(() => unsealBlobToken({ ...a, tag: Buffer.alloc(16).toString('base64') }, key))
  assert.throws(() => unsealBlobToken({ ...a, ciphertext: Buffer.from('tampered').toString('base64') }, key))
  assert.throws(() => sealBlobToken(TOKEN))
  const wrongKey = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs8', format: 'pem' })
  assert.throws(() => unsealBlobToken(a, wrongKey))
})

function harness(options = {}) {
  const state = { puts: [], deletes: [], reads: [], stored: options.stored, writes: 0 }
  const sdk = {
    put: async (pathname, bytes, opts) => {
      state.puts.push({ pathname, bytes, opts })
      if (options.putFailure) throw new Error(`Provider exposed ${TOKEN}`)
      return { url: `https://${options.badHost || HOST}/${pathname}` }
    },
    del: async (pathname, opts) => {
      state.deletes.push({ pathname, opts })
      if (options.deleteFailure) throw new Error(`Provider exposed ${TOKEN}`)
    },
  }
  const ref = {
    get: async () => {
      if (options.readFailure) throw new Error('Database unavailable')
      return { exists: Boolean(state.stored), data: () => state.stored }
    },
    set: async value => {
      if (options.writeFailure) throw new Error('Database unavailable')
      state.writes++; state.stored = value
    },
  }
  const load = loader({
    '@vercel/blob': sdk,
    '@/lib/firebase-admin': { getAdminDb: () => ({ collection: name => {
      assert.equal(name, 'server_credentials')
      return { doc: id => { assert.equal(id, 'room_blob'); return ref } }
    } }) },
  }, {
    process: { env: { FIREBASE_PRIVATE_KEY: key } },
    fetch: async (url, opts) => {
      state.reads.push({ url, opts })
      const bytes = options.badBody ? Buffer.from('wrong') : state.puts.at(-1).bytes
      return new Response(options.privateStore ? null : bytes, { status: options.privateStore ? 403 : 200, headers: { 'Content-Type': 'image/png' } })
    },
  })
  return { state, load, blob: load('lib/room-blob.ts'), credentials: load('lib/room-blob-credentials.ts') }
}

test('rejects empty, malformed, wrong-store and non-string tokens before any network access', async () => {
  const { blob, state } = harness()
  for (const value of ['', null, {}, '"' + TOKEN + '"', 'BLOB_READ_WRITE_TOKEN=' + TOKEN, 'vercel_blob_rw_foreign_test', TOKEN + '\nextra']) {
    assert.throws(() => blob.validateRoomBlobToken(value), e => e.status === 400)
  }
  assert.equal(blob.validateRoomBlobToken(` ${TOKEN} `), TOKEN)
  assert.equal(state.puts.length, 0)
})

test('connection proves upload/public-read/delete before saving only an encrypted credential', async () => {
  const { credentials, state } = harness()
  const result = await credentials.configureRoomBlob(TOKEN, 'admin-test')
  assert.equal(result.configured, true)
  assert.equal(state.puts.length, 1)
  assert.match(state.puts[0].pathname, /^al22\/storage-check\/[a-f0-9-]+\.png$/)
  assert.equal(state.puts[0].opts.access, 'public')
  assert.equal(state.puts[0].opts.token, TOKEN)
  assert.equal(state.puts[0].opts.allowOverwrite, false)
  assert.equal(state.deletes[0].pathname, state.puts[0].pathname)
  assert.equal(state.reads[0].opts.redirect, 'error')
  assert.equal(state.writes, 1)
  assert.equal(JSON.stringify(state.stored).includes(TOKEN), false)
  assert.equal(state.stored.updatedBy, 'admin-test')
  assert.equal((await credentials.getRoomBlobCredentials()).token, TOKEN)
  assert.equal(JSON.stringify(await credentials.getRoomBlobStatus()).includes(TOKEN), false)
})

test('failed storage verification never replaces previous configuration or leaks provider errors', async () => {
  for (const problem of [{ putFailure: true }, { privateStore: true }, { badBody: true }, { badHost: 'foreign.invalid' }, { deleteFailure: true }]) {
    const previous = { unchanged: true }
    const { credentials, state } = harness({ ...problem, stored: previous })
    await assert.rejects(credentials.configureRoomBlob(TOKEN, 'admin-test'), error => error.status === 503 && !error.message.includes(TOKEN))
    assert.equal(state.stored, previous)
    assert.equal(state.writes, 0)
    if (!problem.putFailure) assert.equal(state.deletes.length, 1)
    if (problem.badHost) assert.equal(state.reads.length, 0)
  }
})

test('missing config allows legacy storage but database/decryption failures fail closed', async () => {
  assert.equal(await harness().credentials.getRoomBlobCredentials(), null)
  for (const options of [{ readFailure: true }, { stored: { storeId: STORE, verifiedAt: 'date', sealedToken: {} } }]) {
    await assert.rejects(harness(options).credentials.getRoomBlobCredentials(), e => e.status === 503)
  }
})

test('verification of an existing token does not rewrite the configuration', async () => {
  const { credentials, state } = harness()
  await credentials.configureRoomBlob(TOKEN, 'admin-test')
  const stored = state.stored
  await credentials.recheckRoomBlob()
  assert.equal(state.writes, 1)
  assert.equal(state.stored, stored)
  assert.equal(state.deletes.length, 2)
})

test('room upload uses the dedicated public store and cleanup only accepts new files', async () => {
  const { blob, state } = harness()
  const storage = blob.createBlobPhotoStorage(TOKEN)
  const uploaded = await storage.upload('1', { key: 'photo-new', type: 'image/jpeg', bytes: new Uint8Array([255, 216, 255]) })
  assert.match(uploaded.path, /^al22\/rooms\/1\/[a-f0-9-]+\.jpg$/)
  assert.equal(uploaded.src, `https://${HOST}/${uploaded.path}`)
  assert.equal(state.puts[0].opts.token, TOKEN)
  await assert.rejects(storage.removeUpload('al22/rooms/1/existing.jpg'))
  assert.equal(state.deletes.length, 0)
  await storage.removeUpload(uploaded.path)
  assert.equal(state.deletes.length, 1)
  await assert.rejects(storage.removeUpload(uploaded.path))
})

test('room upload errors are sanitized and do not fall back to another provider', async () => {
  const { blob } = harness({ putFailure: true })
  await assert.rejects(blob.createBlobPhotoStorage(TOKEN).upload('2', { type: 'image/png', bytes: new Uint8Array([1]), key: 'photo-new' }), e => e.status === 503 && !e.message.includes(TOKEN))
})

test('real room save pipeline publishes Blob URLs and retains existing photos', async () => {
  const { load, blob, state } = harness()
  const { DEFAULT_ROOM_CONTENT } = load('lib/room-content.ts')
  const { saveRoomContent } = load('lib/room-content-save.ts')
  const current = structuredClone(DEFAULT_ROOM_CONTENT[0])
  const { id, ...draft } = current
  const photo = { key: 'photo-new', type: 'image/jpeg', bytes: new Uint8Array([255, 216, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0]) }
  let committed
  const result = await saveRoomContent(current, { ...draft, photos: [...draft.photos, { upload: photo.key, alt: 'Nuova foto' }] }, [photo], {
    ...blob.createBlobPhotoStorage(TOKEN), commit: async content => { committed = content },
  })
  assert.equal(result, committed)
  assert.equal(result.photos.length, current.photos.length + 1)
  for (let i = 0; i < current.photos.length; i++) assert.equal(result.photos[i].src, current.photos[i].src)
  assert.ok(result.photos.at(-1).src.startsWith(`https://${HOST}/al22/rooms/1/`))
  assert.equal(result.revision, current.revision + 1)
  assert.equal(state.deletes.length, 0)
})

test('real room pipeline cleans new Blob files on conflict but keeps uncertain commits', async () => {
  for (const conflict of [true, false]) {
    const { load, blob, state } = harness()
    const { DEFAULT_ROOM_CONTENT } = load('lib/room-content.ts')
    const { saveRoomContent, RoomContentError } = load('lib/room-content-save.ts')
    const current = structuredClone(DEFAULT_ROOM_CONTENT[0]), { id, ...draft } = current
    const photo = { key: 'photo-new', type: 'image/jpeg', bytes: new Uint8Array([255, 216, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0]) }
    await assert.rejects(saveRoomContent(current, { ...draft, photos: [{ upload: photo.key, alt: '' }] }, [photo], {
      ...blob.createBlobPhotoStorage(TOKEN), commit: async () => { throw conflict ? new RoomContentError('Conflict', 409) : new Error('Unknown commit result') },
    }))
    assert.equal(state.deletes.length, conflict ? 1 : 0)
  }
})

function routeHarness({ unauthorized = false, role = 'admin', email = 'al22suite@gmail.com', disabled = false } = {}) {
  const calls = { connect: 0, verify: 0, status: 0 }
  const { RoomBlobError } = harness().blob
  const load = loader({
    'next/server': { NextResponse: { json: (body, opts) => Response.json(body, opts) } },
    '@/lib/firebase-admin': {
      getAdminAuth: () => ({
        verifyIdToken: async () => { if (unauthorized) throw new Error('Invalid token'); return { uid: 'admin-test', email: 'al22suite@gmail.com' } },
        getUser: async uid => { assert.equal(uid, 'admin-test'); return { email, disabled } },
      }),
      getAdminDb: () => ({ collection: name => {
        assert.equal(name, 'users')
        return { doc: uid => {
          assert.equal(uid, 'admin-test')
          return { get: async () => ({ exists: role !== null, data: () => ({ role, email: 'al22suite@gmail.com' }) }) }
        } }
      } }),
    },
    '@/lib/room-blob': { RoomBlobError },
    '@/lib/room-blob-credentials': {
      getRoomBlobStatus: async () => { calls.status++; return { configured: false } },
      configureRoomBlob: async (token, uid) => { assert.equal(uid, 'admin-test'); assert.equal(token, TOKEN); calls.connect++; return { configured: true } },
      recheckRoomBlob: async () => { calls.verify++; return { configured: true } },
    },
  })
  return { route: load('app/api/admin/blob-storage/route.ts'), calls }
}
const get = () => new Request('https://test.invalid/api/admin/blob-storage', { headers: { Authorization: 'Bearer test-token' } })
const post = (body, contentType = 'application/json') => new Request('https://test.invalid/api/admin/blob-storage', { method: 'POST', headers: { 'Content-Type': contentType, Authorization: 'Bearer test-token' }, body })

test('both configuration endpoints authenticate before reading credentials or input', async () => {
  const { route, calls } = routeHarness({ unauthorized: true })
  for (const response of [await route.GET(get()), await route.POST(post('{invalid'))]) {
    assert.equal(response.status, 401)
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store')
  }
  assert.deepEqual(calls, { connect: 0, verify: 0, status: 0 })
})

test('only the active owner admin can read, connect or test Blob, even with a spoofed profile or stale token email', async () => {
  for (const options of [
    { email: 'another-admin@example.com' }, { email: undefined, disabled: true },
    { email: '' }, { role: 'user' }, { role: null }, { disabled: true },
  ]) {
    const { route, calls } = routeHarness(options)
    for (const response of [
      await route.GET(get()),
      await route.POST(post(JSON.stringify({ action: 'connect', token: TOKEN }))),
      await route.POST(post(JSON.stringify({ action: 'verify' }))),
      await route.POST(post('{invalid')),
    ]) assert.equal(response.status, 403)
    assert.deepEqual(calls, { connect: 0, verify: 0, status: 0 })
  }
})

test('owner matching is case-insensitive and still requires admin authorization', async () => {
  const { route, calls } = routeHarness({ email: 'Al22Suite@Gmail.com' })
  assert.equal((await route.GET(get())).status, 200)
  assert.equal(calls.status, 1)
})

test('configuration rejects oversize/invalid requests and never returns the submitted token', async () => {
  const { route, calls } = routeHarness()
  for (const body of ['null', '[]', '{}', '{invalid', JSON.stringify({ action: 'delete' })]) assert.equal((await route.POST(post(body))).status, 400)
  assert.equal((await route.POST(post('x'.repeat(4097)))).status, 413)
  assert.equal((await route.POST(post('{}', 'text/plain'))).status, 400)
  assert.equal(calls.connect, 0)
  const response = await route.POST(post(JSON.stringify({ action: 'connect', token: TOKEN })))
  assert.equal(response.status, 200)
  assert.equal((await response.text()).includes(TOKEN), false)
  assert.equal((await route.POST(post(JSON.stringify({ action: 'verify' })))).status, 200)
  assert.equal(calls.connect, 1)
  assert.equal(calls.verify, 1)
})
