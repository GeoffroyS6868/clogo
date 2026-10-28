import type { Replica } from '~/utils/replicate'
import type { Sampler } from '~/utils/mosaic'

// Pixels per cell: enough for the four sample points of a cell
const PIXELS_PER_CELL = 8
const MAX_SIDE = 1024
// Drawn alpha below this counts as empty (anti-aliased edges)
const MIN_ALPHA = 128

let shared: { canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D } | undefined

// Hidden canvas, created once on demand, client side only
function surface() {
  if (shared) return shared
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas 2D indisponible')
  shared = { canvas, ctx }
  return shared
}

/**
 * Draws the logo once, each shape in its own flat colour rgb(slot + 1, 0, 0), then reads it back in one go:
 * a point is then an array read, whatever the copy count or the paint.
 */
export function rasterSampler(logo: Logo, replica: Replica): Sampler {
  const { canvas, ctx } = surface()
  const side = Math.min(MAX_SIDE, PIXELS_PER_CELL * logo.cells)
  if (canvas.width === side) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, side, side)
  } else {
    canvas.width = side
    canvas.height = side
  }
  const paths = logo.shapes.map(s => new Path2D(shapePath(s.id, logo.corner, logo.smooth)))
  const stroke = logo.paint === 'stroke'
  const unit = side / 1000
  ctx.setTransform(unit, 0, 0, unit, side / 2, side / 2)
  ctx.scale(replica.fit, replica.fit)
  ctx.lineWidth = replica.strokeWidth
  ctx.lineJoin = 'miter'
  ctx.miterLimit = MITER_LIMIT
  for (const c of replica.copies) {
    ctx.save()
    ctx.translate(c.x, c.y)
    ctx.rotate(c.angle * Math.PI / 180)
    ctx.scale(c.k, c.k)
    const color = `rgb(${c.slot + 1}, 0, 0)`
    const path = paths[c.slot]!
    if (stroke) {
      ctx.strokeStyle = color
      ctx.stroke(path)
    } else {
      ctx.fillStyle = color
      ctx.fill(path)
    }
    ctx.restore()
  }
  const { data } = ctx.getImageData(0, 0, side, side)
  const last = logo.shapes.length - 1
  const pixel = (v: number) => Math.min(side - 1, Math.max(0, Math.floor((v + 500) * unit)))

  return (x, y) => {
    const at = (pixel(y) * side + pixel(x)) * 4
    if (data[at + 3]! < MIN_ALPHA) return null
    // Anti-aliased borders between two shapes land on one or the other
    return Math.min(last, Math.max(0, Math.round(data[at]!) - 1))
  }
}
