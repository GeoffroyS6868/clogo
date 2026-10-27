export interface Copy {
  x: number
  y: number
  angle: number
  // Scale of the unit shape
  k: number
}

export interface Replica {
  copies: Copy[]
  fit: number
  strokeWidth: number
}

export const DEFAULT_LOGO: Logo = {
  shape: 'petal',
  layout: 'circle',
  circleCount: 8,
  gridSize: 3,
  spread: 0.6,
  size: 0.5,
  rotation: 0,
  twist: 0,
  paint: 'fill'
}

export const LOGO_LIMITS = {
  circleCount: { min: 2, max: 24, step: 1 },
  gridSize: { min: 2, max: 6, step: 1 },
  spread: { min: 0, max: 1, step: 0.01 },
  size: { min: 0.1, max: 1, step: 0.01 },
  rotation: { min: 0, max: 360, step: 1 },
  twist: { min: -180, max: 180, step: 1 }
} as const

const VIEW = 500
// Half-side of the logo once fitted: leaves a margin of VIEW - FIT_EXTENT
const FIT_EXTENT = 430
const CIRCLE_RADIUS = 350
const CIRCLE_SIZE = 320
const GRID_SPAN = 700
const GRID_SIZE = 800
const STROKE = 14

export const roundTo = (v: number, digits = 2) => Number(v.toFixed(digits))

function circleCopies({ circleCount: n, spread, size, rotation, twist }: Logo): Copy[] {
  const radius = spread * CIRCLE_RADIUS
  const k = size * CIRCLE_SIZE / 100
  return Array.from({ length: n }, (_, i) => {
    const theta = -90 + i * 360 / n
    const rad = theta * Math.PI / 180
    return {
      x: radius * Math.cos(rad),
      y: radius * Math.sin(rad),
      angle: theta + 90 + rotation + i * twist,
      k
    }
  })
}

function gridCopies({ gridSize: n, spread, size, rotation, twist }: Logo): Copy[] {
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
      k
    }
  })
}

export function replicate(logo: Logo): Replica {
  const copies = logo.layout === 'circle' ? circleCopies(logo) : gridCopies(logo)
  const { radius } = SHAPES[logo.shape]
  const extent = Math.max(...copies.map(c => Math.hypot(c.x, c.y) + radius * c.k))
  const fit = FIT_EXTENT / extent
  // Same scale for every copy; divided out so the line is STROKE units wide once fitted
  const strokeWidth = STROKE / ((copies[0]?.k ?? 1) * fit)
  return { copies, fit, strokeWidth }
}

export function toSvg(logo: Logo): string {
  const { copies, fit, strokeWidth } = replicate(logo)
  const d = SHAPES[logo.shape].d
  const paint = logo.paint === 'fill'
    ? 'fill="currentColor"'
    : `fill="none" stroke="currentColor" stroke-width="${roundTo(strokeWidth)}" stroke-linejoin="round"`
  const paths = copies.map((c) => {
    const transform = `translate(${roundTo(c.x)} ${roundTo(c.y)}) rotate(${roundTo(c.angle)}) scale(${roundTo(c.k, 4)})`
    return `    <path d="${d}" transform="${transform}"/>`
  })
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-VIEW} ${-VIEW} ${VIEW * 2} ${VIEW * 2}" width="${VIEW * 2}" height="${VIEW * 2}">`,
    `  <g transform="scale(${roundTo(fit, 4)})" ${paint}>`,
    ...paths,
    '  </g>',
    '</svg>',
    ''
  ].join('\n')
}

export function randomLogo(rand: () => number = Math.random): Logo {
  const between = (min: number, max: number) => min + rand() * (max - min)
  const int = (min: number, max: number) => Math.floor(between(min, max + 1))
  const step = (v: number, by: number) => Math.round(v / by) * by
  const { circleCount, gridSize, spread, size, rotation, twist } = LOGO_LIMITS
  return {
    shape: SHAPE_IDS[int(0, SHAPE_IDS.length - 1)] ?? DEFAULT_LOGO.shape,
    layout: rand() < 0.5 ? 'circle' : 'square',
    circleCount: int(circleCount.min, circleCount.max),
    gridSize: int(gridSize.min, gridSize.max),
    spread: roundTo(between(spread.min, spread.max)),
    size: roundTo(between(size.min, size.max)),
    rotation: step(between(rotation.min, rotation.max), 5),
    // Often straight, to keep most logos calm
    twist: rand() < 1 / 3 ? 0 : step(between(twist.min, twist.max), 5),
    paint: rand() < 0.25 ? 'stroke' : 'fill'
  }
}
