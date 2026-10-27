const STORAGE_KEY = 'c-logo:logo:v1'

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
function parse(data: unknown): Logo {
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
    background: color(v.background) ?? d.background
  }
}

function read(): Logo {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return parse(raw ? JSON.parse(raw) : null)
  } catch {
    return structuredClone(DEFAULT_LOGO)
  }
}

function write(logo: Logo) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logo))
  } catch {
    // stockage plein ou indisponible : on garde le logo en mémoire
  }
}

export function useLogo() {
  const logo = useState<Logo>('logo', () => structuredClone(DEFAULT_LOGO))
  // Turns true one frame after the saved logo is read: transitions stay off until then
  const ready = useState('logo-ready', () => false)

  onMounted(() => {
    logo.value = read()
    requestAnimationFrame(() => {
      ready.value = true
    })
  })

  function set(next: Logo) {
    logo.value = next
    write(next)
  }

  function patch(changes: Partial<Logo>) {
    set({ ...logo.value, ...changes })
  }

  // Add at the end (the oldest goes when full), or remove unless it is the last one
  function toggleShape(id: ShapeId) {
    const { shapes } = logo.value
    let next: ShapeSlot[]
    if (shapes.some(s => s.id === id)) {
      if (shapes.length === 1) return
      next = shapes.filter(s => s.id !== id)
    } else {
      next = [...shapes, { id, color: null }].slice(-MAX_SHAPES)
    }
    patch({ shapes: next, circleCount: snapCircleCount(logo.value.circleCount, next.length) })
  }

  function setColor(slot: number, color: string | null) {
    patch({ shapes: logo.value.shapes.map((s, i) => i === slot ? { ...s, color } : s) })
  }

  function reset() {
    set(structuredClone(DEFAULT_LOGO))
  }

  // The dice explore the geometry: the user's colours stay
  function shuffle() {
    const { shapes, background } = logo.value
    const next = randomLogo()
    set({
      ...next,
      shapes: next.shapes.map((s, i) => ({ ...s, color: shapes[i]?.color ?? null })),
      background
    })
  }

  return { logo, ready, patch, toggleShape, setColor, reset, shuffle }
}
