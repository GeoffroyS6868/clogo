// Which shape is visible at a point of the frame, if any: given by the caller, so this file stays free of the DOM
export type Sampler = (x: number, y: number) => number | null

export interface Mosaic {
  // One path per shape that has cells
  paths: { slot: number, d: string }[]
}

const FRAME = 1000
const HALF = FRAME / 2
// Sample points per cell, at (±q, ±q) from its centre: a lattice of half a cell.
// One touched point fills the cell. Two would be closer to half coverage, but a logo at low resolution
// (a 2 × 2 grid on 8 cells) then vanishes, and thin lines flicker.
const SAMPLES = [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const
const HEX_SIDES = 6

const r2 = (v: number) => Number(v.toFixed(2))

export function mosaic(logo: Logo, sample: Sampler): Mosaic {
  const counts = logo.shapes.map(() => 0)

  // Shape of a cell, or -1 when it stays empty
  function shapeOf(cx: number, cy: number, q: number): number {
    counts.fill(0)
    let hits = 0
    for (const [sx, sy] of SAMPLES) {
      const slot = sample(cx + sx * q, cy + sy * q)
      if (slot === null) continue
      hits++
      counts[slot]!++
    }
    if (!hits) return -1
    // Most points wins; a tie goes to the smaller index
    let best = 0
    for (let s = 1; s < counts.length; s++) if (counts[s]! > counts[best]!) best = s
    return best
  }

  const cells: string[][] = counts.map(() => [])

  if (logo.filter === 'pixel') {
    const n = logo.cells
    const c = FRAME / n
    const side = r2(c * (1 - logo.gap))
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const x = -HALF + c * (i + 0.5)
        const y = -HALF + c * (j + 0.5)
        const slot = shapeOf(x, y, c / 4)
        if (slot >= 0) cells[slot]!.push(`M${r2(x - side / 2)} ${r2(y - side / 2)}h${side}v${side}h${-side}Z`)
      }
    }
  } else if (logo.filter === 'hex') {
    const w = FRAME / logo.cells
    const radius = w / Math.sqrt(3)
    const rowStep = 1.5 * radius
    const drawn = radius * (1 - logo.gap)
    // Every hexagon has the same outline: written once, relative to its top vertex,
    // so a cell only formats its starting point
    const vertex = (k: number) => [drawn * Math.cos((-90 + 60 * k) * Math.PI / 180), drawn * Math.sin((-90 + 60 * k) * Math.PI / 180)] as const
    const outline = Array.from({ length: HEX_SIDES - 1 }, (_, k) => {
      const [x0, y0] = vertex(k)
      const [x1, y1] = vertex(k + 1)
      return `${r2(x1 - x0)} ${r2(y1 - y0)}`
    })
    const rest = `l${outline.join(' ')}Z`
    const rows = Math.ceil((HALF + radius) / rowStep)
    const cols = Math.ceil((HALF + w) / w) + 1
    for (let j = -rows; j <= rows; j++) {
      const y = j * rowStep
      if (Math.abs(y) > HALF + radius) continue
      // Odd rows are shifted by half a cell
      const shift = Math.abs(j) % 2 === 1 ? 0.5 : 0
      for (let i = -cols; i <= cols; i++) {
        const x = (i + shift) * w
        if (Math.abs(x) > HALF + w) continue
        const slot = shapeOf(x, y, w / 4)
        if (slot >= 0) cells[slot]!.push(`M${r2(x)} ${r2(y - drawn)}${rest}`)
      }
    }
  }

  return {
    paths: cells.flatMap((list, slot) => list.length ? [{ slot, d: list.join('') }] : [])
  }
}
