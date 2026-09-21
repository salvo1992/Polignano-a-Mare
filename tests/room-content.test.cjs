const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')

require.extensions['.ts'] = (module, filename) => {
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText
  module._compile(source, filename)
}
const { DEFAULT_ROOM_CONTENT, roomContentSchema, resolveRoomContent, MAX_PHOTO_BYTES, MAX_UPLOAD_BYTES } = require('../lib/room-content.ts')
const { saveRoomContent, RoomContentError } = require('../lib/room-content-save.ts')
const current = () => structuredClone(DEFAULT_ROOM_CONTENT[0])
const draftOf = room => { const { id, ...draft } = room; return draft }
const jpeg = (key = 'photo-new', size = 12) => {
  const bytes = new Uint8Array(size); bytes.set([255, 216, 255]); return { key, bytes, type: 'image/jpeg' }
}
function harness(overrides = {}) {
  const state = { uploaded: [], removed: [], committed: [] }
  return { state, deps: {
    upload: async (id, file) => { state.uploaded.push(file.key); return { path: `${id}/${file.key}`, src: `https://test.invalid/${id}/${file.key}` } },
    removeUpload: async path => { state.removed.push(path) },
    commit: async (room, revision) => { state.committed.push({ room, revision }) },
    ...overrides,
  } }
}

test('both existing room defaults are valid and retain their identity', () => {
  for (const room of DEFAULT_ROOM_CONTENT) assert.equal(roomContentSchema.safeParse(draftOf(room)).success, true)
  assert.deepEqual(DEFAULT_ROOM_CONTENT.map(room => room.id), ['1', '2'])
  assert.equal(resolveRoomContent('2', undefined).name, DEFAULT_ROOM_CONTENT[1].name)
})

test('publishes changed text and ordered gallery together; omitted photos are not physically deleted', async () => {
  const room = current(), { state, deps } = harness()
  const draft = { ...draftOf(room), name: 'Nome aggiornato', photos: [room.photos[1], room.photos[0]] }
  const saved = await saveRoomContent(room, draft, [], deps)
  assert.equal(saved.name, 'Nome aggiornato')
  assert.equal(saved.revision, 1)
  assert.deepEqual(saved.photos, draft.photos)
  assert.equal(state.committed.length, 1)
  assert.equal(state.committed[0].revision, 0)
  assert.deepEqual(state.removed, [])
  assert.equal(room.revision, 0)
})

test('uploads a new cover before publishing and preserves its caption', async () => {
  const room = current(), { state, deps } = harness()
  const saved = await saveRoomContent(room, { ...draftOf(room), photos: [{ upload: 'photo-new', alt: 'Balcone' }, room.photos[0]] }, [jpeg()], deps)
  assert.equal(saved.photos[0].src, 'https://test.invalid/1/photo-new')
  assert.equal(saved.photos[0].alt, 'Balcone')
  assert.deepEqual(state.uploaded, ['photo-new'])
  assert.equal(state.committed.length, 1)
})

test('rejects stale edits without uploading', async () => {
  const room = current(), { state, deps } = harness()
  await assert.rejects(saveRoomContent(room, { ...draftOf(room), revision: 9 }, [], deps), e => e.status === 409)
  assert.deepEqual(state.uploaded, [])
  assert.deepEqual(state.committed, [])
})

test('invalid gallery, foreign URLs, duplicate/missing uploads and spoofed types never publish', async () => {
  const room = current()
  const cases = [
    [{ photos: [] }, []],
    [{ photos: [{ src: 'https://foreign.invalid/a.jpg', alt: '' }] }, []],
    [{ photos: [{ upload: 'photo-new', alt: '' }] }, []],
    [{ photos: [{ upload: 'photo-new', alt: '' }, { upload: 'photo-new', alt: '' }] }, [jpeg(), jpeg()]],
    [{ photos: [{ upload: 'photo-new', alt: '' }] }, [{ ...jpeg(), type: 'image/png' }]],
    [{ photos: [{ upload: 'photo-new', alt: '' }] }, [jpeg('photo-new', MAX_PHOTO_BYTES + 1)]],
    [{ photos: [{ upload: 'photo-a', alt: '' }, { upload: 'photo-b', alt: '' }] }, [jpeg('photo-a', MAX_PHOTO_BYTES), jpeg('photo-b', MAX_UPLOAD_BYTES - MAX_PHOTO_BYTES + 1)]],
    [{ name: '' }, []],
  ]
  for (const [patch, files] of cases) {
    const { state, deps } = harness()
    await assert.rejects(saveRoomContent(room, { ...draftOf(room), ...patch }, files, deps), RoomContentError)
    assert.deepEqual(state.uploaded, [])
    assert.deepEqual(state.committed, [])
  }
})

test('a partial upload failure removes only new unsaved files', async () => {
  const room = current(), { state, deps } = harness()
  const upload = deps.upload
  deps.upload = async (id, file) => { if (file.key === 'photo-b') throw new Error('Storage unavailable'); return upload(id, file) }
  await assert.rejects(saveRoomContent(room, { ...draftOf(room), photos: [{ upload: 'photo-a', alt: '' }, { upload: 'photo-b', alt: '' }] }, [jpeg('photo-a'), jpeg('photo-b')], deps))
  assert.deepEqual(state.removed, ['1/photo-a'])
  assert.deepEqual(state.committed, [])
})

test('transaction conflicts clean up uploads and preserve the other admin changes', async () => {
  const room = current(), { state, deps } = harness({ commit: async () => { throw new RoomContentError('Conflict', 409) } })
  await assert.rejects(saveRoomContent(room, { ...draftOf(room), photos: [{ upload: 'photo-new', alt: '' }] }, [jpeg()], deps), e => e.status === 409)
  assert.deepEqual(state.removed, ['1/photo-new'])
})

test('an uncertain transaction result never deletes potentially published photos', async () => {
  const room = current(), { state, deps } = harness({ commit: async () => { throw new Error('Connection lost after commit') } })
  await assert.rejects(saveRoomContent(room, { ...draftOf(room), photos: [{ upload: 'photo-new', alt: '' }] }, [jpeg()], deps))
  assert.deepEqual(state.removed, [])
})
