const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')

function load(relativePath, dependencies = {}) {
  const filename = path.join(__dirname, '..', relativePath)
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const module = { exports: {} }
  vm.runInNewContext(source, {
    module, exports: module.exports,
    require: name => {
      if (Object.hasOwn(dependencies, name)) return dependencies[name]
      if (name === 'react' || name === 'react/jsx-runtime') return require(name)
      throw new Error(`Unexpected dependency: ${name}`)
    },
  }, { filename })
  return module.exports
}

function render(user) {
  const tag = name => ({ children, ...props }) => React.createElement(name, props, children)
  const { OwnerStorageSettings } = load('components/owner-storage-settings.tsx', {
    '@/components/auth-provider': { useAuth: () => ({ user }) },
    '@/components/blob-storage-settings': { BlobStorageSettings: () => { throw new Error('Closed panel must not mount the token form') } },
    '@/components/ui/button': { Button: tag('button') },
    '@/components/ui/card': Object.fromEntries(['Card', 'CardContent', 'CardDescription', 'CardHeader', 'CardTitle'].map(name => [name, tag('div')])),
    'lucide-react': { ChevronDown: tag('svg'), ChevronUp: tag('svg'), Loader2: tag('svg') },
    '@/lib/firebase': { get auth() { throw new Error('Closed panel must not request credentials') } },
    '@/lib/storage-owner': load('lib/storage-owner.ts'),
  })
  return renderToStaticMarkup(React.createElement(OwnerStorageSettings))
}

test('configuration is absent for signed-out users, other admins and owners without the admin role', () => {
  for (const user of [null, { uid: 'other', email: 'another@example.com', role: 'admin' }, { uid: 'owner', email: 'al22suite@gmail.com', role: 'user' }]) {
    assert.equal(render(user), '')
  }
})

test('owner starts with an accessible collapsed panel without loading the token form', () => {
  const html = render({ uid: 'owner', email: 'Al22Suite@Gmail.com', role: 'admin' })
  assert.match(html, /Archivio foto — area personale/)
  assert.match(html, /Mostra configurazione Blob/)
  assert.match(html, /aria-expanded="false"/)
  assert.match(html, /hidden=""/)
  assert.doesNotMatch(html, /BLOB_READ_WRITE_TOKEN|Verifica configurazione foto|<input/)
})

test('the owner panel is in Settings and storage setup is absent from room management', () => {
  const admin = fs.readFileSync(path.join(__dirname, '../app/admin/page.tsx'), 'utf8')
  const rooms = fs.readFileSync(path.join(__dirname, '../components/room-content-management.tsx'), 'utf8')
  const settings = admin.match(/<TabsContent value="settings"[\s\S]*?<\/TabsContent>/)?.[0]
  assert.match(settings, /<OwnerStorageSettings\s*\/>/)
  assert.doesNotMatch(rooms, /BlobStorageSettings|storage-diagnostics|Verifica archivio foto/)
})
