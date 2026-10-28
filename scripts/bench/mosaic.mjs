// Microbenchmark of the pure mosaic builder, two versions side by side, alternating.
// Usage: node scripts/bench/mosaic.mjs <before.ts> <after.ts>
// Checks that both draw the same cells (vertices within 0.02) before timing them.
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const [a, b] = await Promise.all(process.argv.slice(2, 4).map(f => import(pathToFileURL(resolve(f)))))

// A disc of slot 0 with a ring of slot 1: deterministic, cheap, and every cell kind appears
const sampler = (x, y) => {
  const r = Math.hypot(x, y)
  return r < 250 ? 0 : r < 420 ? 1 : null
}

function vertices(d) {
  const out = []
  for (const sub of d.split('M').filter(Boolean)) {
    const [head, ...tail] = sub.replace('Z', '').split(/(?=[hlvL])/)
    let [x, y] = head.trim().split(/\s+/).map(Number)
    out.push([x, y])
    // Absolute L, or relative h / v / l (pairs)
    const step = {
      L: n => [[n[0], n[1]]],
      h: n => [[x + n[0], y]],
      v: n => [[x, y + n[0]]],
      l: n => Array.from({ length: n.length / 2 }, (_, i) => [n[2 * i], n[2 * i + 1]])
    }
    for (const part of tail) {
      const nums = part.slice(1).trim().split(/\s+/).map(Number)
      for (const p of step[part[0]](nums)) {
        if (part[0] === 'l') {
          x += p[0]
          y += p[1]
        } else {
          [x, y] = p
        }
        out.push([x, y])
      }
    }
  }
  return out
}

function same(ma, mb) {
  if (ma.paths.length !== mb.paths.length) return false
  return ma.paths.every((p, i) => {
    const va = vertices(p.d)
    const vb = vertices(mb.paths[i].d)
    return p.slot === mb.paths[i].slot && va.length === vb.length && va.every(([x, y], k) => Math.abs(x - vb[k][0]) < 0.02 && Math.abs(y - vb[k][1]) < 0.02)
  })
}

const cases = [
  { filter: 'hex', cells: 64, gap: 0.1 },
  { filter: 'hex', cells: 24, gap: 0 },
  { filter: 'pixel', cells: 64, gap: 0.1 }
]
const logoOf = c => ({ shapes: [{ id: 'star' }, { id: 'glyph' }], ...c })

let errors = 0
const report = []
for (const c of cases) {
  const logo = logoOf(c)
  if (!same(a.mosaic(logo, sampler), b.mosaic(logo, sampler))) errors++
  const times = { before: [], after: [] }
  let cellsDrawn = 0
  for (let r = 0; r < 60; r++) {
    for (const [name, mod] of r % 2 ? [['after', b], ['before', a]] : [['before', a], ['after', b]]) {
      const t0 = performance.now()
      const m = mod.mosaic(logo, sampler)
      times[name].push(performance.now() - t0)
      cellsDrawn += m.paths.reduce((s, p) => s + p.d.split('M').length - 1, 0)
    }
  }
  const med = v => Math.round([...v].sort((x, y) => x - y)[v.length >> 1] * 1000) / 1000
  const range = v => [Math.min(...v), Math.max(...v)].map(x => Math.round(x * 1000) / 1000)
  report.push({ case: `${c.filter} ${c.cells}`, beforeMs: med(times.before), beforeRange: range(times.before), afterMs: med(times.after), afterRange: range(times.after), cellsDrawn })
}
console.log(JSON.stringify({ report, errors }, null, 2))
