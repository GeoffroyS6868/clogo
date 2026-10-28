import type { Mosaic } from '~/utils/mosaic'

export interface Copy {
  x: number
  y: number
  angle: number
  // Scale of the unit shape
  k: number
  // Index in logo.shapes
  slot: number
}

export interface Replica {
  copies: Copy[]
  fit: number
  strokeWidth: number
}

export const DEFAULT_LOGO: Logo = {
  shapes: [{ id: 'petal', color: null }],
  layout: 'circle',
  circleCount: 8,
  gridSize: 3,
  triangleRows: 3,
  rayCount: 6,
  rayLength: 3,
  spread: 0.6,
  size: 0.5,
  rotation: 0,
  twist: 0,
  paint: 'fill',
  corner: 0,
  smooth: false,
  background: null,
  filter: 'none',
  cells: 24,
  gap: 0
}

export const LOGO_LIMITS = {
  circleCount: { min: 2, max: 24, step: 1 },
  gridSize: { min: 2, max: 6, step: 1 },
  triangleRows: { min: 2, max: 6, step: 1 },
  rayCount: { min: 2, max: 12, step: 1 },
  rayLength: { min: 1, max: 6, step: 1 },
  spread: { min: 0, max: 1, step: 0.01 },
  size: { min: 0.1, max: 1, step: 0.01 },
  rotation: { min: 0, max: 360, step: 1 },
  twist: { min: -180, max: 180, step: 1 },
  corner: { min: 0, max: 1, step: 0.01 },
  cells: { min: 8, max: 64, step: 1 },
  gap: { min: 0, max: 0.5, step: 0.01 }
} as const

export const LAYOUTS: Layout[] = ['circle', 'grid', 'triangle', 'rays']
export const MAX_SHAPES = 3
export const COLOR_PATTERN = /^#[0-9a-f]{6}$/i

const VIEW = 500
// Half-side of the logo once fitted: leaves a margin of VIEW - FIT_EXTENT
const FIT_EXTENT = 430
const RING_RADIUS = 350
const RING_SIZE = 320
const GRID_SPAN = 700
const GRID_SIZE = 800
const STROKE = 14
// Sharp outline joins (corners come from the path itself); high enough for the star's tips (ratio ≈ 4.1)
export const MITER_LIMIT = 8

export const roundTo = (v: number, digits = 2) => Number(v.toFixed(digits))

// Smallest circleCount: the lowest multiple of m that is at least 2
export const minCircleCount = (m: number) => Math.ceil(LOGO_LIMITS.circleCount.min / m) * m

// Nearest multiple of m within the circleCount range, so the pattern loops without a seam
export function snapCircleCount(count: number, m: number): number {
  const max = Math.floor(LOGO_LIMITS.circleCount.max / m) * m
  return Math.min(max, Math.max(minCircleCount(m), Math.round(count / m) * m))
}

const rad = (deg: number) => deg * Math.PI / 180

function circleCopies({ circleCount: n, spread, size, rotation, twist, shapes }: Logo): Copy[] {
  const radius = spread * RING_RADIUS
  const k = size * RING_SIZE / 100
  return Array.from({ length: n }, (_, i) => {
    const theta = -90 + i * 360 / n
    return {
      x: radius * Math.cos(rad(theta)),
      y: radius * Math.sin(rad(theta)),
      angle: theta + 90 + rotation + i * twist,
      k,
      slot: i % shapes.length
    }
  })
}

function gridCopies({ gridSize: n, spread, size, rotation, twist, shapes }: Logo): Copy[] {
  const pitch = spread * GRID_SPAN / (n - 1)
  const k = size * GRID_SIZE / n / 100
  const origin = (n - 1) / 2
  return Array.from({ length: n * n }, (_, i) => {
    const row = Math.floor(i / n)
    const col = i % n
    return {
      x: (col - origin) * pitch,
      y: (row - origin) * pitch,
      angle: rotation + (row + col) * twist,
      k,
      // Diagonals: a checkerboard with two shapes
      slot: (row + col) % shapes.length
    }
  })
}

function triangleCopies({ triangleRows: r, spread, size, rotation, twist, shapes }: Logo): Copy[] {
  const pitch = spread * GRID_SPAN / (r - 1)
  const rowHeight = pitch * Math.sqrt(3) / 2
  const k = size * GRID_SIZE / r / 100
  const copies: Copy[] = []
  for (let j = 0; j < r; j++) {
    for (let c = 0; c <= j; c++) {
      copies.push({
        x: (c - j / 2) * pitch,
        // Centred on the barycentre, apex up
        y: (j - 2 * (r - 1) / 3) * rowHeight,
        angle: rotation + j * twist,
        k,
        slot: (j + c) % shapes.length
      })
    }
  }
  return copies
}

function rayCopies({ rayCount: b, rayLength: q, spread, size, rotation, twist, shapes }: Logo): Copy[] {
  const radius = spread * RING_RADIUS
  const k = size * RING_SIZE / q / 100
  return Array.from({ length: b * q }, (_, i) => {
    const branch = Math.floor(i / q)
    const p = i % q
    const theta = -90 + branch * 360 / b
    // No copy at the centre
    const dist = radius * (p + 1) / q
    return {
      x: dist * Math.cos(rad(theta)),
      y: dist * Math.sin(rad(theta)),
      angle: theta + 90 + rotation + p * twist,
      k,
      // Every branch looks the same
      slot: p % shapes.length
    }
  })
}

const LAYOUT_COPIES: Record<Layout, (logo: Logo) => Copy[]> = {
  circle: circleCopies,
  grid: gridCopies,
  triangle: triangleCopies,
  rays: rayCopies
}

export function replicate(logo: Logo): Replica {
  const copies = LAYOUT_COPIES[logo.layout](logo)
  const extent = Math.max(...copies.map(c => Math.hypot(c.x, c.y) + SHAPES[logo.shapes[c.slot]!.id].radius * c.k))
  const fit = FIT_EXTENT / extent
  // Same scale for every copy; divided out so the line is STROKE units wide once fitted
  const strokeWidth = STROKE / ((copies[0]?.k ?? 1) * fit)
  return { copies, fit, strokeWidth }
}

// Relative luminance of a '#rrggbb' colour, 0 (black) to 1 (white)
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Colour of a shape, or null to inherit currentColor.
 * An automatic colour on a chosen background is black or white, whichever contrasts, so the preview matches the export.
 */
export function inkOf(logo: Logo, slot: number): string | null {
  const color = logo.shapes[slot]?.color ?? null
  if (color || !logo.background) return color
  return luminance(logo.background) > 0.18 ? '#000000' : '#ffffff'
}

// With a filter and its mosaic, the copies give way to one path of cells per shape
export function toSvg(logo: Logo, tiles?: Mosaic): string {
  const { copies, fit, strokeWidth } = replicate(logo)
  const stroke = logo.paint === 'stroke'
  const paths = logo.shapes.map(s => shapePath(s.id, logo.corner, logo.smooth))
  const group = stroke
    ? `fill="none" stroke="currentColor" stroke-width="${roundTo(strokeWidth)}" stroke-miterlimit="${MITER_LIMIT}"`
    : 'fill="currentColor"'
  const body = logo.filter !== 'none' && tiles
    ? [
        '  <g fill="currentColor">',
        ...tiles.paths.map((p) => {
          const color = inkOf(logo, p.slot)
          return `    <path d="${p.d}"${color ? ` fill="${color}"` : ''}/>`
        }),
        '  </g>'
      ]
    : [
        `  <g transform="scale(${roundTo(fit, 4)})" ${group}>`,
        ...copies.map((c) => {
          const transform = `translate(${roundTo(c.x)} ${roundTo(c.y)}) rotate(${roundTo(c.angle)}) scale(${roundTo(c.k, 4)})`
          const color = inkOf(logo, c.slot)
          const own = color ? ` ${stroke ? 'stroke' : 'fill'}="${color}"` : ''
          return `    <path d="${paths[c.slot]}" transform="${transform}"${own}/>`
        }),
        '  </g>'
      ]
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-VIEW} ${-VIEW} ${VIEW * 2} ${VIEW * 2}" width="${VIEW * 2}" height="${VIEW * 2}">`,
    ...(logo.background ? [`  <rect x="${-VIEW}" y="${-VIEW}" width="${VIEW * 2}" height="${VIEW * 2}" fill="${logo.background}"/>`] : []),
    ...body,
    '</svg>',
    ''
  ].join('\n')
}

export function randomLogo(rand: () => number = Math.random): Logo {
  const between = (min: number, max: number) => min + rand() * (max - min)
  const int = (min: number, max: number) => Math.floor(between(min, max + 1))
  const step = (v: number, by: number) => Math.round(v / by) * by
  const limits = LOGO_LIMITS
  // Mostly one shape, sometimes a pair or a trio
  const roll = rand()
  const count = roll < 0.6 ? 1 : roll < 0.9 ? 2 : 3
  const pool = [...SHAPE_IDS]
  const shapes: ShapeSlot[] = Array.from({ length: count }, () => ({
    id: pool.splice(int(0, pool.length - 1), 1)[0] ?? DEFAULT_LOGO.shapes[0]!.id,
    color: null
  }))
  return {
    shapes,
    layout: LAYOUTS[int(0, LAYOUTS.length - 1)] ?? DEFAULT_LOGO.layout,
    circleCount: snapCircleCount(int(limits.circleCount.min, limits.circleCount.max), count),
    gridSize: int(limits.gridSize.min, limits.gridSize.max),
    triangleRows: int(limits.triangleRows.min, limits.triangleRows.max),
    rayCount: int(limits.rayCount.min, limits.rayCount.max),
    rayLength: int(limits.rayLength.min, limits.rayLength.max),
    spread: roundTo(between(limits.spread.min, limits.spread.max)),
    size: roundTo(between(limits.size.min, limits.size.max)),
    rotation: step(between(limits.rotation.min, limits.rotation.max), 5),
    // Often straight, to keep most logos calm
    twist: rand() < 1 / 3 ? 0 : step(between(limits.twist.min, limits.twist.max), 5),
    paint: rand() < 0.25 ? 'stroke' : 'fill',
    // Often sharp, otherwise clearly rounded
    corner: rand() < 0.5 ? 0 : roundTo(between(0.2, 1)),
    smooth: rand() < 0.5,
    // Colours and filter are the user's: the dice only explore the geometry
    background: null,
    filter: DEFAULT_LOGO.filter,
    cells: DEFAULT_LOGO.cells,
    gap: DEFAULT_LOGO.gap
  }
}
