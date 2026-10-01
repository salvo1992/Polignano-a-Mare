const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

function loader(mocks = {}, globals = {}) {
  const cache = new Map()
  function load(file) {
    file = path.resolve(__dirname, '..', file)
    if (cache.has(file)) return cache.get(file).exports
    const module = { exports: {} }; cache.set(file, module)
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    vm.runInNewContext(code, {
      module, exports: module.exports, URL, URLSearchParams, Headers, Request, Response, AbortSignal, AbortController,
      console: { log() {}, warn() {}, error() {} }, process: { env: {} },
      fetch: () => { throw new Error('Unexpected network') },
      require: name => {
        if (Object.hasOwn(mocks, name)) return mocks[name]
        if (name === 'server-only') return {}
        if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`)
        if (name.startsWith('.')) return load(path.resolve(path.dirname(file), `${name}.ts`))
        throw new Error(`Unexpected import: ${name}`)
      }, ...globals,
    }, { filename: file })
    return module.exports
  }
  return load
}
const json = value => JSON.parse(JSON.stringify(value))
const quoteRules = loader()('lib/stay-quote.ts')
const statusRules = loader()('lib/room-status.ts')
const dates = ['2026-10-17', '2026-10-18']
const rates = (price = 200) => dates.map(date => ({ date, price, available: 1, minLengthOfStay: 2 }))

test('quotes use nightly CM prices exactly, including checkout exclusion and cent precision', () => {
  const quote = quoteRules.nightlyQuote(dates, rates())
  assert.equal(quote.newPrice, 400)
  assert.equal(quote.pricePerNight, 200)
  assert.equal(quoteRules.nightlyQuote(dates, rates(249)).newPrice, 498)
  assert.equal(quoteRules.nightlyQuote(dates, [{ ...rates()[0], price: 99.99 }, { ...rates()[1], price: 100.02 }]).newPrice, 200.01)
  assert.deepEqual(json(quoteRules.stayDates('2026-10-17', '2026-10-19')), dates)
})
test('dates are strict and nights remain correct across DST and year boundary', () => {
  for (const [start, end] of [['2026-02-30', '2026-03-02'], ['x','y'], ['2026-10-17','2026-10-17'], ['2026-10-19','2026-10-17']]) {
    assert.throws(() => quoteRules.stayDates(start, end))
  }
  assert.equal(quoteRules.stayDates('2026-10-24','2026-10-27').length, 3)
  assert.equal(quoteRules.stayDates('2026-12-31','2027-01-02').length, 2)
})
test('missing, zero and malformed CM prices never fall back to a local price', () => {
  for (const price of [0, -1, NaN, Infinity]) assert.throws(() => quoteRules.nightlyQuote(dates, rates(price)))
  assert.throws(() => quoteRules.nightlyQuote(dates, rates().slice(0, 1)))
})
test('minimum stay and availability cannot be inferred from partial data', () => {
  assert.equal(quoteRules.nightlyQuote(dates.slice(0,1), rates()).minimumStayMet, false)
  assert.equal(quoteRules.nightlyQuote(dates, rates().map(r => ({ ...r, available: 0 }))).available, false)
})
test('existing site supplements remain explicit, bounded and separate from the CM base', () => {
  assert.equal(quoteRules.bookingAmounts(400, 2, 2, 0, 'booking-page').totalAmount, 400)
  assert.equal(quoteRules.bookingAmounts(400, 2, 3, 1, 'booking-page').totalAmount, 616)
  assert.equal(quoteRules.bookingAmounts(400, 2, 1, 1, 'booking-page').totalAmount, 400)
  assert.equal(quoteRules.bookingAmounts(400, 2, 2, 0, 'widget').totalAmount, 418)
  assert.throws(() => quoteRules.bookingAmounts(400, 2, 4, 1, 'booking-page'))
})
test('booking-generated blocks are occupied, not maintenance; manual blocks remain protected', () => {
  const now = new Date('2026-10-01T12:00:00Z')
  const block = { roomId: '1', from: '2026-09-26', to: '2026-10-04', reason: 'auto-booking: legacy' }
  assert.equal(statusRules.roomStatus('1', [], [block], now), 'booked')
  assert.equal(statusRules.roomStatus('1', [], [{ ...block, reason: 'maintenance' }], now), 'maintenance')
  assert.equal(statusRules.roomStatus('1', [], [{ ...block, status: 'cancelled' }], now), 'available')
  assert.equal(statusRules.roomStatus('2', [], [block], now), 'available')
  assert.equal(statusRules.roomStatus('1', [{ roomId: '3076136', checkIn: '2026-10-01', checkOut: '2026-10-04', status: 'paid' }], [], now), 'booked')
})
test('checkout is exclusive, cancelled bookings and expired holds do not occupy a room', () => {
  const booking = { roomId: '1', checkIn: '2026-09-26', checkOut: '2026-10-01', status: 'confirmed' }
  const now = new Date('2026-10-01T12:00:00Z')
  assert.equal(statusRules.roomStatus('1', [booking], [], now), 'available')
  assert.equal(statusRules.roomStatus('1', [{ ...booking, checkOut:'2026-10-04', status:'cancelled' }], [], now), 'available')
  assert.equal(statusRules.roomStatus('1', [{ ...booking, checkOut:'2026-10-04', status:'pending', holdExpiresAt:'2026-10-01T10:00:00Z' }], [], now), 'available')
})
test('live provider occupancy never replaces independent manual blocks or website holds', () => {
  assert.equal(statusRules.isProviderOccupancy({ smoobuId:'123', origin:'booking' }, 'bookings'), true)
  assert.equal(statusRules.isProviderOccupancy({ smoobuId:'123', origin:'site' }, 'bookings'), false)
  assert.equal(statusRules.isProviderOccupancy({ smoobuReservationId:'123', reason:'maintenance' }, 'blocked_dates'), false)
  assert.equal(statusRules.isProviderOccupancy({ smoobuReservationId:'123', reason:'auto-booking: old' }, 'blocked_dates'), true)
})

function memoryDb(seed = {}) {
  const state = structuredClone(seed), writes = []
  let counter = 0
  const snapshot = (ref) => ({ id: ref.id, ref, exists: Boolean(state[ref.col]?.[ref.id]), data: () => state[ref.col]?.[ref.id] })
  const query = (col, filters = []) => ({
    col, filters,
    where(field, op, value) { return query(col, [...filters, [field, op, value]]) },
    async get() {
      const docs = Object.entries(state[col] || {}).filter(([,item]) => filters.every(([field,op,value]) => op === 'in' ? value.includes(item[field]) : item[field] === value)).map(([id]) => snapshot(this.doc(id)))
      return { docs, empty: !docs.length, forEach: fn => docs.forEach(fn) }
    },
    doc(id = `new_${++counter}`) { return { col, id, get: async () => snapshot({col,id}) } },
  })
  const db = {
    collection: col => query(col),
    async runTransaction(fn) {
      const pending = []
      const result = await fn({
        get: ref => ref.filters ? ref.get() : Promise.resolve(snapshot(ref)),
        set: (ref, value, options) => pending.push({ ref, value, options }),
      })
      for (const {ref,value,options} of pending) {
        state[ref.col] ||= {}
        state[ref.col][ref.id] = options?.merge ? {...state[ref.col][ref.id], ...value} : value
      }
      writes.push(...pending)
      return result
    },
  }
  return { db, state, writes }
}
const cmBooking = (patch = {}) => ({ id:'123', roomId:'3076136', arrival:'2026-10-01', departure:'2026-10-04', status:'confirmed', referer:'booking', numAdult:2, numChild:0, firstName:'Test', lastName:'Guest', email:'test@example.invalid', phone:'', price:600, created:'2026-09-01 12:00', modified:'2026-10-01 12:00', ...patch })
function reconciliation(seed, bookings = []) {
  const harness = memoryDb(seed)
  const cm = { getApartmentsCached: async () => [], getBookings: async () => bookings }
  return { ...harness, cm, service: loader({ '@/lib/firebase-admin': {getAdminDb: () => harness.db}, '@/lib/smoobu-client': {smoobuClient:cm} })('lib/smoobu-reconciliation.ts') }
}
test('cancellation soft-releases only linked auto-blocks, keeps manual/overlapping bookings and audit data', async () => {
  const h = reconciliation({
    bookings: { legacy:{smoobuId:123, status:'confirmed'}, other:{smoobuId:'456', status:'confirmed'} },
    blocked_dates: {
      legacy:{smoobuReservationId:'123', reason:'auto-booking: old', from:'2026-09-26', to:'2026-10-04'},
      linked:{bookingId:'legacy', autoBlocked:true}, manual:{smoobuReservationId:'123', reason:'maintenance'},
      other:{smoobuReservationId:'456', reason:'auto-booking: other'},
    },
  })
  await h.service.reconcileSmoobuBooking(cmBooking({status:'cancelled'}))
  assert.equal(h.state.bookings.legacy.status, 'cancelled')
  assert.equal(h.state.blocked_dates.legacy.status, 'cancelled')
  assert.equal(h.state.blocked_dates.linked.status, 'cancelled')
  assert.equal(h.state.blocked_dates.legacy.from, '2026-09-26')
  assert.equal(h.state.bookings.other.status, 'confirmed')
  assert.equal(h.state.blocked_dates.manual.status, undefined)
  assert.equal(h.state.blocked_dates.other.status, undefined)
})
test('sync is idempotent and moves only the matching reservation block on date changes', async () => {
  const h = reconciliation({})
  await h.service.reconcileSmoobuBooking(cmBooking())
  await h.service.reconcileSmoobuBooking(cmBooking())
  assert.equal(Object.keys(h.state.bookings).length, 1)
  assert.equal(Object.keys(h.state.blocked_dates).length, 1)
  await h.service.reconcileSmoobuBooking(cmBooking({arrival:'2026-10-02', departure:'2026-10-05', modified:'2026-10-02 10:00'}))
  assert.equal(h.state.blocked_dates.smoobu_123.from, '2026-10-02T00:00:00.000Z')
  await h.service.reconcileSmoobuBooking(cmBooking({status:'cancelled'}))
  assert.equal(h.state.bookings.smoobu_123.status, 'confirmed', 'older update cannot cancel a newer reservation')
})
test('website payment status and totals are not rewritten by sync', async () => {
  const h = reconciliation({bookings:{site:{origin:'site', smoobuReservationId:123, status:'paid', totalAmount:418, paymentId:'keep'}}})
  await h.service.reconcileSmoobuBooking(cmBooking())
  assert.equal(h.state.bookings.site.status, 'paid')
  assert.equal(h.state.bookings.site.totalAmount, 418)
  assert.equal(h.state.bookings.site.paymentId, 'keep')
})
test('empty or failed CM fetch never infers cancellations or writes local records', async () => {
  const h = reconciliation({bookings:{keep:{smoobuId:'123',status:'confirmed'}}})
  await h.service.syncSmoobuBookings()
  assert.equal(h.writes.length, 0)
  h.cm.getBookings = async () => { throw new Error('page 2 failed') }
  await assert.rejects(h.service.syncSmoobuBookings())
  assert.equal(h.writes.length, 0)
})
test('unknown rooms and provider maintenance are not imported as guest reservations', async () => {
  const h = reconciliation({})
  assert.equal(await h.service.reconcileSmoobuBooking(cmBooking({roomId:'999'})), false)
  assert.equal(await h.service.reconcileSmoobuBooking(cmBooking({status:'blocked'})), false)
  assert.equal(h.writes.length, 0)
})
test('new reservations are protected before old cancelled blocks are released', async () => {
  const h = reconciliation({}, [cmBooking({id:'123',status:'cancelled'}), cmBooking({id:'456'})])
  await h.service.syncSmoobuBookings()
  assert.equal(h.writes[0].value.smoobuId, '456')
  assert.equal(h.state.bookings.smoobu_123.status, 'cancelled')
})
test('client fetches cancellation pages explicitly and converts cancellation type', async () => {
  const calls = []
  const raw = { id:123, type:'cancellation', arrival:'2026-10-01', departure:'2026-10-04', apartment:{id:3076136}, channel:{name:'Booking.com'} }
  const cm = loader({ '@/lib/smoobu-credentials':{getSmoobuCredentials:async()=>({apiKey:'fake-test-only'})}, '@/lib/smoobu-hmac':{} }, {
    fetch:async (url, options) => { calls.push({url,options}); return Response.json({ bookings:[raw], page_count:2, total_items:2 }) },
  })('lib/smoobu-client.ts').smoobuClient
  const result = await cm.getBookings('2026-10-01','2026-10-04',undefined,true)
  assert.equal(calls.length,2)
  assert.ok(calls.every(call => call.url.includes('showCancellation=true') && call.options.cache === 'no-store'))
  assert.equal(result[0].status,'cancelled')
})
const nextMock = { NextResponse:{json:(body, options)=>Response.json(body,options)} }
test('price API uses CM quote and exposes a failure instead of a local fallback', async () => {
  let fail = false
  const POST = loader({ 'next/server':nextMock, '@/lib/firebase-admin':{}, '@/lib/smoobu-pricing':{getSmoobuQuote:async()=> { if(fail) throw new Error('outage'); return quoteRules.nightlyQuote(dates,rates()) }} })('app/api/bookings/calculate-price/route.ts').POST
  const req = () => new Request('https://example.invalid',{method:'POST',body:JSON.stringify({roomId:'1',checkIn:dates[0],checkOut:'2026-10-19'})})
  assert.equal((await (await POST(req())).json()).newPrice,400)
  fail = true
  assert.equal((await POST(req())).status,503)
})
test('forged or delayed cancellation webhook is verified against the current CM record', async () => {
  const records = []
  const POST = loader({ 'next/server':nextMock, '@/lib/smoobu-client':{smoobuClient:{getBooking:async()=>cmBooking()}}, '@/lib/smoobu-reconciliation':{reconcileSmoobuBooking:async b=>records.push(b)} })('app/api/smoobu/webhook/route.ts').POST
  const response = await POST(new Request('https://example.invalid',{method:'POST',body:JSON.stringify({action:'cancelReservation',data:{id:123,status:'cancelled'}})}))
  assert.equal(response.status,200)
  assert.equal(records[0].status,'confirmed')
})
test('booking creation refuses client-tampered prices and writes only the freshly verified total', async () => {
  const h = memoryDb({})
  class Timestamp { static fromMillis(value) { return {toMillis:()=>value} } }
  let quote = quoteRules.nightlyQuote(dates,rates())
  const POST = loader({
    'next/server':nextMock, 'firebase-admin/firestore':{Timestamp,FieldValue:{serverTimestamp:()=> 'server-time'}},
    '@/lib/firebase-admin':{getAdminDb:()=>h.db},
    '@/lib/smoobu-client':{smoobuClient:{resolveApartmentId:async()=>3076136, checkAvailability:async()=>true}},
    '@/lib/smoobu-pricing':{getSmoobuQuote:async()=>quote},
  })('app/api/bookings/create/route.ts').POST
  // Dates far enough in the future to keep this test stable over time.
  const future = new Date(Date.now()+30*86400000).toISOString().slice(0,10)
  const departure = new Date(Date.parse(future)+2*86400000).toISOString().slice(0,10)
  const req = total => new Request('https://example.invalid',{method:'POST',body:JSON.stringify({roomId:'1',checkIn:future,checkOut:departure,guests:2,email:'test@example.invalid',firstName:'Test',lastName:'Only',pricePerNight:1,totalAmount:total})})
  assert.equal((await POST(req(2))).status,409)
  assert.equal(h.writes.length,0)
  const response = await POST(req(400))
  assert.equal(response.status,200)
  const saved = Object.values(h.state.bookings)[0]
  assert.equal(saved.pricePerNight,200)
  assert.equal(saved.totalAmount,400)
  assert.equal(Object.keys(h.state.booking_date_locks).length,2)
  assert.equal((await POST(req(400))).status,409,'concurrent date lock remains enforced')
})
test('status UI has no database writes and quote consumers cannot use fallback prices', () => {
  const read = file => fs.readFileSync(path.resolve(__dirname,'..',file),'utf8')
  assert.doesNotMatch(read('components/room-status-toggle.tsx'), /updateDoc|setDoc/)
  assert.doesNotMatch(read('hooks/use-room-prices.ts'), /room\.price|180|150/)
  assert.doesNotMatch(read('app/api/bookings/calculate-price/route.ts'), /pricing_seasons|pricing_overrides/)
  assert.match(read('hooks/use-dynamic-price.ts'), /state\.key === key/)
  assert.match(read('hooks/use-dynamic-price.ts'), /controller\.signal\.aborted/)
})

test('manual sync rejects anonymous callers before reading or writing reservation data', async () => {
  let calls = 0
  class AdminApiAuthError extends Error { constructor() { super('Unauthorized'); this.status = 401 } }
  const route = loader({
    'next/server':nextMock,
    '@/lib/admin-api-auth':{AdminApiAuthError, requireAdminIdToken:async()=>{throw new AdminApiAuthError()}},
    '@/lib/smoobu-client':{smoobuClient:{getBookings:async()=>{calls++; return []}}},
    '@/lib/smoobu-reconciliation':{syncSmoobuBookings:async()=>{calls++; return {}}},
  })('app/api/smoobu/sync-bookings/route.ts')
  assert.equal((await route.POST(new Request('https://example.invalid',{method:'POST',body:'{}'}))).status,401)
  assert.equal((await route.GET(new Request('https://example.invalid'))).status,401)
  assert.equal(calls,0)
})

test('availability combines live CM with manual blocks and holds, ignoring stale imported copies', async () => {
  const day = new Date(Date.now()+10*86400000).toISOString().slice(0,10)
  const next = new Date(Date.parse(day)+86400000).toISOString().slice(0,10)
  const later = new Date(Date.parse(day)+2*86400000).toISOString().slice(0,10)
  const h = memoryDb({
    bookings:{old:{roomId:'1',smoobuId:'123',origin:'booking',status:'confirmed',checkIn:day,checkOut:next}},
    blocked_dates:{manual:{roomId:'1',reason:'maintenance',from:next,to:later}},
  })
  class Timestamp {}
  const mocks = {
    'next/server':nextMock, 'firebase-admin/firestore':{Timestamp}, '@/lib/firebase-admin':{getAdminDb:()=>h.db},
    '@/lib/smoobu-client':{smoobuClient:{resolveApartmentId:async()=>3076136,getRates:async()=>[{date:day,available:1},{date:next,available:1}]}},
  }
  const GET = loader(mocks)('app/api/bookings/unavailable-dates/route.ts').GET
  const request = new Request('https://example.invalid?roomId=1')
  const response = await GET(request)
  assert.equal(response.status,200)
  const {dates:blocked} = await response.json()
  assert.ok(!blocked.includes(day),'cancelled/stale CM copy cannot override live CM')
  assert.ok(blocked.includes(next),'independent manual block stays unavailable')
  assert.ok(blocked.includes(later),'missing CM day fails closed')
  h.state.bookings.hold={roomId:'1',origin:'site',status:'pending',checkIn:day,checkOut:next}
  assert.ok((await (await GET(request)).json()).dates.includes(day),'website hold stays unavailable')
  const originalCollection = h.db.collection
  h.db.collection = col => col === 'blocked_dates' ? {get:async()=>{throw new Error('DB outage')}} : originalCollection(col)
  assert.equal((await GET(request)).status,503,'unreadable local blocks fail closed')
})
