type Point = [number, number]

interface Shape {
  label: string
  // Bounding circle from the origin, used to fit the logo in its frame
  radius: number | ((slot: ShapeSlot) => number)
  // Angular shapes: vertices in clockwise order, in [-50, 50]² and pointing up; computed from the count when adjustable
  points?: Point[] | ((count: number) => Point[])
  // Curved shapes: fixed closed path, same box
  d?: string
}

interface CountRule {
  label: string
  min: number
  max: number
  default: number
}

// The shapes with a count: what it is called, and its range
export const SHAPE_COUNT: Partial<Record<ShapeId, CountRule>> = {
  star: { label: 'Branches', min: 3, max: 12, default: 5 },
  polygon: { label: 'Côtés', min: 3, max: 8, default: 3 },
  cross: { label: 'Bras', min: 2, max: 8, default: 4 }
}

// Character of a new glyph shape, and the fallback for an unknown one
export const DEFAULT_CHAR = 'A'

const R = 50
// Half-width of a cross arm
const ARM = 12

const polar = (angle: number, radius: number): Point => [radius * Math.cos(angle), radius * Math.sin(angle)]
const turn = (k: number, of: number) => -Math.PI / 2 + k * 2 * Math.PI / of

// Valleys of a star, as a fraction of the tips: the four-pointed star keeps its old, thin look,
// then the classic five-pointed ratio, opening a little with the branches so that they stay readable
const starValley = (n: number) => n <= 4 ? 0.28 : 0.382 + 0.02 * (n - 5)

function starPoints(n: number): Point[] {
  return Array.from({ length: 2 * n }, (_, k) => polar(-Math.PI / 2 + k * Math.PI / n, k % 2 ? R * starValley(n) : R))
}

function polygonPoints(n: number): Point[] {
  return Array.from({ length: n }, (_, k) => polar(turn(k, n), R))
}

// Per arm, its two tips then the inner corner towards the next arm, on the bisector
function crossPoints(n: number): Point[] {
  const corner = ARM / Math.sin(Math.PI / n)
  return Array.from({ length: n }, (_, k): Point[] => {
    const theta = turn(k, n)
    const [ux, uy] = polar(theta, 1)
    // Normal to the right of the arm
    const [vx, vy] = [-uy, ux]
    return [
      [R * ux - ARM * vx, R * uy - ARM * vy],
      [R * ux + ARM * vx, R * uy + ARM * vy],
      polar(theta + Math.PI / n, corner)
    ]
  }).flat()
}

// In the order of the buttons (5 per row)
export const SHAPES: Record<ShapeId, Shape> = {
  circle: {
    label: 'Cercle',
    radius: 50,
    d: 'M0 -50 A50 50 0 1 1 0 50 A50 50 0 1 1 0 -50 Z'
  },
  square: {
    label: 'Carré',
    radius: Math.hypot(50, 50),
    points: [[-50, -50], [50, -50], [50, 50], [-50, 50]]
  },
  polygon: {
    label: 'Polygone',
    radius: R,
    points: polygonPoints
  },
  diamond: {
    label: 'Losange',
    radius: 50,
    points: [[0, -50], [32, 0], [0, 50], [-32, 0]]
  },
  star: {
    label: 'Étoile',
    radius: R,
    points: starPoints
  },
  petal: {
    label: 'Pétale',
    radius: 50,
    // Two arcs of radius (50² + 28²) / (2 · 28), for a max width of 56
    d: 'M0 -50 A58.64 58.64 0 0 1 0 50 A58.64 58.64 0 0 1 0 -50 Z'
  },
  bar: {
    label: 'Barre',
    radius: Math.hypot(12, 50),
    points: [[-12, -50], [12, -50], [12, 50], [-12, 50]]
  },
  arc: {
    label: 'Arc',
    // Upper half ring, shifted down by 25 so its box is centred
    radius: Math.hypot(50, 25),
    d: 'M-50 25 A50 50 0 0 1 50 25 L26 25 A26 26 0 0 0 -26 25 Z'
  },
  cross: {
    label: 'Croix',
    radius: Math.hypot(R, ARM),
    points: crossPoints
  },
  glyph: {
    label: 'Caractère',
    radius: slot => glyphOf(slot).radius
  }
}

export const SHAPE_IDS = Object.keys(SHAPES) as ShapeId[]

// Below this a corner is left sharp
const MIN_ROUND = 0.01
// Smooth corners reach further along the sides and use longer handles
const SMOOTH_REACH = 1.5
const SMOOTH_HANDLE = 0.82

export const isAngular = (id: ShapeId) => SHAPES[id].points !== undefined

// The glyph of a slot; an unknown character falls back to the default one
const glyphOf = (slot: ShapeSlot) => GLYPHS[slot.char ?? ''] ?? GLYPHS[DEFAULT_CHAR]!

export function newSlot(id: ShapeId): ShapeSlot {
  const rule = SHAPE_COUNT[id]
  return {
    id,
    color: null,
    ...(rule && { count: rule.default }),
    ...(id === 'glyph' && { char: DEFAULT_CHAR })
  }
}

export function shapeRadius(slot: ShapeSlot): number {
  const { radius } = SHAPES[slot.id]
  return typeof radius === 'function' ? radius(slot) : radius
}

// The vertices of an angular shape, or undefined; a count out of range is brought back to it
function pointsOf(slot: ShapeSlot): Point[] | undefined {
  const { points } = SHAPES[slot.id]
  if (typeof points !== 'function') return points
  const rule = SHAPE_COUNT[slot.id]!
  const count = Math.round(slot.count ?? rule.default)
  return points(Math.min(rule.max, Math.max(rule.min, count)))
}

const sub = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]]

function toward(from: Point, to: Point, dist: number): Point {
  const [dx, dy] = sub(to, from)
  const len = Math.hypot(dx, dy)
  return [from[0] + dx / len * dist, from[1] + dy / len * dist]
}

const fmt = ([x, y]: Point) => `${roundTo(x)} ${roundTo(y)}`

// Each vertex becomes a cubic running from P1 to P2 (on the two sides next to it)
// with handles pointing at the vertex; null when the corner stays sharp
function roundedCorner(a: Point, p: Point, b: Point, corner: number, smooth: boolean) {
  const toA = sub(a, p)
  const toB = sub(b, p)
  const lenA = Math.hypot(...toA)
  const lenB = Math.hypot(...toB)
  const cos = (toA[0] * toB[0] + toA[1] * toB[1]) / (lenA * lenB)
  // Turning angle at the vertex (absolute: reflex vertices follow the same maths)
  const phi = Math.PI - Math.acos(Math.max(-1, Math.min(1, cos)))
  // Two neighbouring corners can at most meet in the middle of a side
  const limit = Math.min(lenA, lenB) / 2
  let t: number
  let h: number
  if (smooth) {
    t = Math.min(SMOOTH_REACH * corner * limit, limit)
    h = SMOOTH_HANDLE * t
  } else {
    t = corner * limit
    // Exact circular arc as a cubic: handle = (4/3) tan(φ/4) · radius, radius = t / tan(φ/2)
    h = t * 4 / 3 * Math.tan(phi / 4) / Math.tan(phi / 2)
  }
  if (t < MIN_ROUND || !(phi > 1e-6) || !Number.isFinite(h)) return null
  const p1 = toward(p, a, t)
  const p2 = toward(p, b, t)
  return { p1, p2, c1: toward(p1, p, h), c2: toward(p2, p, h) }
}

export function shapePath(slot: ShapeSlot, corner: number, smooth: boolean): string {
  if (slot.id === 'glyph') return glyphOf(slot).d
  const points = pointsOf(slot)
  if (!points) return SHAPES[slot.id].d ?? ''
  const n = points.length
  const corners = points.map((p, i) => roundedCorner(points[(i + n - 1) % n]!, p, points[(i + 1) % n]!, corner, smooth))
  const last = corners[n - 1]
  let at = fmt(last ? last.p2 : points[n - 1]!)
  const segments: string[] = []
  points.forEach((p, i) => {
    const c = corners[i]
    const start = fmt(c ? c.p1 : p)
    // No line when the previous curve already ends here, nor to a sharp last vertex (Z closes the path)
    if (start !== at && (c || i < n - 1)) segments.push(`L${start}`)
    if (c) segments.push(`C${fmt(c.c1)} ${fmt(c.c2)} ${fmt(c.p2)}`)
    at = fmt(c ? c.p2 : p)
  })
  return `M${fmt(last ? last.p2 : points[n - 1]!)} ${segments.join(' ')} Z`
}
