interface Limit {
  min: number
  max: number
}

function num(value: unknown, fallback: number, { min, max }: Limit, integer = false): number {
  const ok = typeof value === 'number' && value >= min && value <= max && (!integer || Number.isInteger(value))
  return ok ? value : fallback
}

function color(value: unknown): string | null | undefined {
  if (value === null) return null
  return typeof value === 'string' && COLOR_PATTERN.test(value) ? value : undefined
}

// 1 to 3 valid entries without duplicates, otherwise the default
function parseShapes(value: unknown): ShapeSlot[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_SHAPES) return DEFAULT_LOGO.shapes
  const slots: ShapeSlot[] = []
  for (const item of value) {
    const id = SHAPE_IDS.find(s => s === item?.id)
    const c = color(item?.color)
    if (!id || c === undefined || slots.some(s => s.id === id)) return DEFAULT_LOGO.shapes
    slots.push({ id, color: c })
  }
  return slots
}

// Field by field: an invalid or missing value falls back to the default
export function parseLogo(data: unknown): Logo {
  const d = DEFAULT_LOGO
  const v = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>
  const limits = LOGO_LIMITS
  const shapes = parseShapes(v.shapes)
  return {
    shapes,
    layout: LAYOUTS.find(id => id === v.layout) ?? d.layout,
    circleCount: snapCircleCount(num(v.circleCount, d.circleCount, limits.circleCount, true), shapes.length),
    gridSize: num(v.gridSize, d.gridSize, limits.gridSize, true),
    triangleRows: num(v.triangleRows, d.triangleRows, limits.triangleRows, true),
    rayCount: num(v.rayCount, d.rayCount, limits.rayCount, true),
    rayLength: num(v.rayLength, d.rayLength, limits.rayLength, true),
    spread: num(v.spread, d.spread, limits.spread),
    size: num(v.size, d.size, limits.size),
    rotation: num(v.rotation, d.rotation, limits.rotation),
    twist: num(v.twist, d.twist, limits.twist),
    paint: v.paint === 'fill' || v.paint === 'stroke' ? v.paint : d.paint,
    corner: num(v.corner, d.corner, limits.corner),
    smooth: typeof v.smooth === 'boolean' ? v.smooth : d.smooth,
    background: color(v.background) ?? d.background,
    filter: v.filter === 'none' || v.filter === 'pixel' || v.filter === 'hex' ? v.filter : d.filter,
    cells: num(v.cells, d.cells, limits.cells, true),
    gap: num(v.gap, d.gap, limits.gap)
  }
}

// Same shapes in the same order with the same colours
function sameShapes(a: ShapeSlot[], b: ShapeSlot[]): boolean {
  return a.length === b.length && a.every((s, i) => s.id === b[i]?.id && s.color === b[i]?.color)
}

// Fields whose value differs between two logos
export function changedFields(a: Logo, b: Logo): (keyof Logo)[] {
  return (Object.keys(a) as (keyof Logo)[]).filter(key =>
    key === 'shapes' ? !sameShapes(a.shapes, b.shapes) : a[key] !== b[key]
  )
}

export function sameLogo(a: Logo, b: Logo): boolean {
  return changedFields(a, b).length === 0
}

// A plain copy: structuredClone throws on the reactive proxies that state objects can hold
export function copyLogo(logo: Logo): Logo {
  return { ...logo, shapes: logo.shapes.map(s => ({ ...s })) }
}
