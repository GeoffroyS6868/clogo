const STORAGE_KEY = 'clogo:logo:v1'

interface Limit {
  min: number
  max: number
}

function num(value: unknown, fallback: number, { min, max }: Limit, integer = false): number {
  const ok = typeof value === 'number' && value >= min && value <= max && (!integer || Number.isInteger(value))
  return ok ? value : fallback
}

// Field by field: an invalid or missing value falls back to the default
function parse(data: unknown): Logo {
  const d = DEFAULT_LOGO
  const v = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>
  const limits = LOGO_LIMITS
  return {
    shape: SHAPE_IDS.find(id => id === v.shape) ?? d.shape,
    layout: v.layout === 'circle' || v.layout === 'square' ? v.layout : d.layout,
    circleCount: num(v.circleCount, d.circleCount, limits.circleCount, true),
    gridSize: num(v.gridSize, d.gridSize, limits.gridSize, true),
    spread: num(v.spread, d.spread, limits.spread),
    size: num(v.size, d.size, limits.size),
    rotation: num(v.rotation, d.rotation, limits.rotation),
    twist: num(v.twist, d.twist, limits.twist),
    paint: v.paint === 'fill' || v.paint === 'stroke' ? v.paint : d.paint
  }
}

function read(): Logo {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return parse(raw ? JSON.parse(raw) : null)
  } catch {
    return { ...DEFAULT_LOGO }
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
  const logo = useState<Logo>('logo', () => ({ ...DEFAULT_LOGO }))
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

  function reset() {
    set({ ...DEFAULT_LOGO })
  }

  function shuffle() {
    set(randomLogo())
  }

  return { logo, ready, patch, reset, shuffle }
}
