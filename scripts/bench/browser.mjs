// In-page measurements, loaded into the running app (production build) by the browser driver:
//   const b = await import('http://localhost:3199/browser.mjs')
// Every function returns plain numbers plus an `errors` count, so a run that did no work shows up.

const KEY = 'c-logo:logo:v1'
const DESIGNS_KEY = 'c-logo:designs:v1'

const BASE = {
  shapes: [{ id: 'petal', color: null }], layout: 'circle', circleCount: 8, gridSize: 3, triangleRows: 3,
  rayCount: 6, rayLength: 3, spread: 0.6, size: 0.5, rotation: 0, twist: 0, scale: 1, paint: 'fill',
  corner: 0, smooth: false, background: null
}

export const SCENARIOS = {
  light: BASE,
  heavy: {
    ...BASE,
    shapes: [{ id: 'star', color: null, count: 7 }, { id: 'glyph', color: '#e5484d', char: 'g' }, { id: 'cross', color: null, count: 6 }],
    layout: 'rays', rayCount: 12, rayLength: 6, spread: 0.8, size: 0.7, twist: 15, paint: 'stroke', corner: 0.5, smooth: true
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms))
const frame = () => new Promise(r => requestAnimationFrame(r))
// Resolves just after the frame that follows the current task has been painted
const afterPaint = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)))
// The next task: every microtask (Vue's render flush) has run, no frame needed
function macrotask() {
  const { port1, port2 } = new MessageChannel()
  return new Promise((r) => {
    port1.onmessage = () => r()
    port2.postMessage(0)
  })
}

function stats(values) {
  const v = [...values].sort((a, b) => a - b)
  const at = q => v[Math.min(v.length - 1, Math.floor(q * v.length))] ?? NaN
  const round = x => Math.round(x * 100) / 100
  return { n: v.length, median: round(at(0.5)), p95: round(at(0.95)), max: round(v.at(-1) ?? NaN) }
}

function watchLongTasks() {
  const tasks = []
  const obs = new PerformanceObserver(list => tasks.push(...list.getEntries().map(e => e.duration)))
  obs.observe({ type: 'longtask' })
  return () => {
    obs.disconnect()
    return { count: tasks.length, total: Math.round(tasks.reduce((s, d) => s + d, 0)) }
  }
}

/** Prepares a scenario: stores its logo (and optionally a gallery) and reloads. Run load() or the others after. */
export function setup(name, { designs = 0 } = {}) {
  localStorage.setItem(KEY, JSON.stringify(SCENARIOS[name]))
  if (designs) {
    const list = Array.from({ length: designs }, (_, i) => ({
      id: `bench-${i}`,
      savedAt: 1e12 + i,
      logo: { ...SCENARIOS[i % 2 ? 'heavy' : 'light'], rotation: i * 7 % 360 }
    }))
    localStorage.setItem(DESIGNS_KEY, JSON.stringify(list))
  } else {
    localStorage.removeItem(DESIGNS_KEY)
  }
  setTimeout(() => location.reload(), 0)
  return name
}

/** Navigation and paint timings of the current page load, plus bytes and heap. */
export async function load() {
  await ready()
  await sleep(1000)
  const nav = performance.getEntriesByType('navigation')[0]
  const paint = Object.fromEntries(performance.getEntriesByType('paint').map(p => [p.name, Math.round(p.startTime)]))
  const lcp = await new Promise((resolve) => {
    let last = 0
    new PerformanceObserver((list) => {
      last = list.getEntries().at(-1)?.startTime ?? last
    }).observe({ type: 'largest-contentful-paint', buffered: true })
    setTimeout(() => resolve(Math.round(last)), 100)
  })
  const resources = performance.getEntriesByType('resource')
  const bytes = resources.reduce((s, r) => s + (r.encodedBodySize || 0), 0)
  return {
    visible: document.visibilityState,
    ttfb: Math.round(nav.responseStart),
    domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
    loaded: Math.round(nav.loadEventEnd),
    fcp: paint['first-contentful-paint'] ?? null,
    lcp,
    requests: resources.length + 1,
    encodedBytes: bytes + (nav.encodedBodySize || 0),
    apiRequests: resources.filter(r => r.name.includes('/api/')).map(r => r.name.replace(location.origin, '')),
    heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e5) / 10 : null,
    domNodes: document.getElementsByTagName('*').length,
    errors: nav.responseStatus && nav.responseStatus !== 200 ? 1 : 0
  }
}

// Hydrated and the saved logo read: the work surface turns on its transitions
async function ready() {
  const end = performance.now() + 10000
  while (!document.querySelector('[data-surface][data-ready]') && performance.now() < end) await sleep(50)
  await sleep(300)
}

async function openTab(id) {
  await ready()
  document.getElementById(`tab-${id}`)?.click()
  await sleep(300)
}

function thumbOf(label) {
  return [...document.querySelectorAll('[role=slider]')].find(t => t.getAttribute('aria-label') === label)
}

const stored = () => localStorage.getItem(KEY)

/**
 * Input-to-paint latency of one slider step, `steps` times, alternating right / left.
 * drag: true holds a pointer on the bar first, as a mouse drag does (transitions are off while dragging).
 */
export async function slider(label = 'Écart', { tab = 'layout', steps = 40, drag = false } = {}) {
  await openTab(tab)
  await afterPaint()
  const thumb = thumbOf(label)
  if (!thumb) return { errors: 1, reason: `no slider ${label}` }
  if (document.visibilityState !== 'visible') return { errors: 1, reason: 'page hidden: frames do not run' }
  if (drag) thumb.closest('.group')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
  thumb.focus()
  await afterPaint()
  const stop = watchLongTasks()
  const surface = document.querySelector('[data-surface]')
  const times = []
  const work = []
  const inFrame = []
  let changed = 0
  let done = 0
  const budget = performance.now() + 25000
  for (let i = 0; i < steps && performance.now() < budget; i++) {
    const before = stored()
    const t0 = performance.now()
    thumb.dispatchEvent(new KeyboardEvent('keydown', { key: i % 2 ? 'ArrowLeft' : 'ArrowRight', bubbles: true }))
    // Script (Vue flush included) plus style and layout, independent of the display's refresh rate
    await macrotask()
    surface?.getBoundingClientRect()
    work.push(performance.now() - t0)
    // Frame callbacks that ran before ours in the same frame
    inFrame.push(await new Promise(r => requestAnimationFrame(ts => r(performance.now() - ts))))
    await new Promise(r => setTimeout(r, 0))
    times.push(performance.now() - t0)
    if (stored() !== before) changed++
    done++
  }
  if (drag) window.dispatchEvent(new PointerEvent('pointerup'))
  await sleep(600)
  return {
    label,
    drag,
    toPaint: stats(times.filter(d => d < 250)),
    hostStalls: times.filter(d => d >= 250).length,
    work: stats(work),
    inFrame: stats(inFrame.filter(d => d < 250)),
    longTasks: stop(),
    changed,
    errors: done - changed + (done < steps ? 1 : 0)
  }
}

/** Frame intervals while the copies fly from one layout to another (the transition runs on the main thread). */
export async function layoutSwitch({ from = 'Rayons', to = 'Grille', rounds = 4 } = {}) {
  await openTab('layout')
  await afterPaint()
  const button = text => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === text)
  if (!button(from) || !button(to)) return { errors: 1, reason: 'layout buttons not found' }
  const stop = watchLongTasks()
  const intervals = []
  const clickToPaint = []
  let errors = 0
  for (let r = 0; r < rounds * 2; r++) {
    const target = r % 2 ? from : to
    const before = stored()
    const t0 = performance.now()
    button(target).click()
    await afterPaint()
    clickToPaint.push(performance.now() - t0)
    if (stored() === before) errors++
    let last = performance.now()
    const end = last + 550
    while (performance.now() < end) {
      await frame()
      const now = performance.now()
      intervals.push(now - last)
      last = now
    }
  }
  // Pauses of the host window (the page loses its frames for ~2 s without any long task) are not the app:
  // counted apart, and left out of the frame statistics
  const STALL = 250
  const live = intervals.filter(d => d < STALL)
  const dropped = live.filter(d => d > 1000 / 60 * 1.5).length
  return {
    clickToPaint: stats(clickToPaint.filter(d => d < STALL)),
    frame: stats(live),
    droppedFrames: dropped,
    frames: live.length,
    hostStalls: intervals.length - live.length + clickToPaint.filter(d => d >= STALL).length,
    longTasks: stop(),
    errors
  }
}

/** Everything for the scenario already set up, in one call. */
export async function run({ withGallery = false } = {}) {
  return {
    load: await load(),
    sliderKeys: await slider('Écart'),
    sliderDrag: await slider('Écart', { drag: true }),
    layoutSwitch: await layoutSwitch(),
    ...(withGallery ? { gallery: await gallery() } : {})
  }
}

/** Time from clicking « Mes designs » to the painted gallery, and back. */
export async function gallery({ rounds = 3 } = {}) {
  await ready()
  const lib = () => [...document.querySelectorAll('header button')].find(b => b.getAttribute('aria-label') === 'Mes designs')
  if (!lib()) return { errors: 1, reason: 'no gallery button' }
  const drawnCount = () => document.querySelectorAll('[data-thumb] svg').length
  const stop = watchLongTasks()
  const open = []
  const settled = []
  let thumbs = 0
  let drawn = 0
  for (let r = 0; r < rounds; r++) {
    const t0 = performance.now()
    lib().click()
    await afterPaint()
    open.push(performance.now() - t0)
    // Until the thumbnails in view are drawn: the count holds for three frames
    let last = -1
    let still = 0
    const end = performance.now() + 3000
    while (still < 3 && performance.now() < end) {
      await afterPaint()
      const n = drawnCount()
      still = n === last ? still + 1 : 0
      last = n
    }
    settled.push(performance.now() - t0)
    thumbs = document.querySelectorAll('[aria-label^="Charger le design"]').length
    drawn = drawnCount()
    lib().click()
    await afterPaint()
    await sleep(300)
  }
  return { open: stats(open), settled: stats(settled), thumbs, drawn, longTasks: stop(), errors: thumbs && drawn ? 0 : 1 }
}
