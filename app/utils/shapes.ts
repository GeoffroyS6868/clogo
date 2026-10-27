type Point = [number, number]

interface Shape {
  label: string
  // Bounding circle from the origin, used to fit the logo in its frame
  radius: number
  // Angular shapes: vertices in clockwise order, in [-50, 50]² and pointing up
  points?: Point[]
  // Curved shapes: fixed closed path, same box
  d?: string
}

const STAR_INNER = 9.9

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
  triangle: {
    label: 'Triangle',
    radius: 50,
    points: [[0, -50], [43.3, 25], [-43.3, 25]]
  },
  diamond: {
    label: 'Losange',
    radius: 50,
    points: [[0, -50], [32, 0], [0, 50], [-32, 0]]
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
  star: {
    label: 'Étoile',
    radius: 50,
    points: [
      [0, -50], [STAR_INNER, -STAR_INNER], [50, 0], [STAR_INNER, STAR_INNER],
      [0, 50], [-STAR_INNER, STAR_INNER], [-50, 0], [-STAR_INNER, -STAR_INNER]
    ]
  }
}

export const SHAPE_IDS = Object.keys(SHAPES) as ShapeId[]

// Below this a corner is left sharp
const MIN_ROUND = 0.01
// Smooth corners reach further along the sides and use longer handles
const SMOOTH_REACH = 1.5
const SMOOTH_HANDLE = 0.82

export const isAngular = (id: ShapeId) => SHAPES[id].points !== undefined

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

export function shapePath(id: ShapeId, corner: number, smooth: boolean): string {
  const { points, d } = SHAPES[id]
  if (!points) return d ?? ''
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
