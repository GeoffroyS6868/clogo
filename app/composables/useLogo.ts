const STORAGE_KEY = 'c-logo:logo:v1'
const HISTORY_LIMIT = 100
// A change that follows the last one within this delay, on the same fields, is the same gesture
const GROUP_MS = 500

function read(): Logo {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return parseLogo(raw ? JSON.parse(raw) : null)
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
  // In memory only: the current logo is saved, its history is not
  const past = useState<Logo[]>('logo-past', () => [])
  const future = useState<Logo[]>('logo-future', () => [])
  const canUndo = computed(() => past.value.length > 0)
  const canRedo = computed(() => future.value.length > 0)
  let last: { at: number, fields: string } | null = null

  onMounted(() => {
    logo.value = read()
    requestAnimationFrame(() => {
      ready.value = true
    })
  })

  function set(next: Logo, { group = false } = {}) {
    const fields = changedFields(logo.value, next).join()
    if (!fields) return
    const now = Date.now()
    const sameGesture = group && last !== null && now - last.at < GROUP_MS && last.fields === fields
    if (!sameGesture) past.value = [...past.value, logo.value].slice(-HISTORY_LIMIT)
    future.value = []
    last = group ? { at: now, fields } : null
    logo.value = next
    write(next)
  }

  function patch(changes: Partial<Logo>) {
    set({ ...logo.value, ...changes }, { group: true })
  }

  // Add at the end (the oldest goes when full), or remove unless it is the last one
  function toggleShape(id: ShapeId) {
    const { shapes } = logo.value
    let next: ShapeSlot[]
    if (shapes.some(s => s.id === id)) {
      if (shapes.length === 1) return
      next = shapes.filter(s => s.id !== id)
    } else {
      next = [...shapes, newSlot(id)].slice(-MAX_SHAPES)
    }
    set({ ...logo.value, shapes: next, circleCount: snapCircleCount(logo.value.circleCount, next.length) })
  }

  // A setting of one shape (colour, count, character): dragging a bar is a single step, like patch
  function setShape(slot: number, changes: ShapeChanges) {
    patch({ shapes: logo.value.shapes.map((s, i) => i === slot ? { ...s, ...changes } : s) })
  }

  function setColor(slot: number, color: string | null) {
    setShape(slot, { color })
  }

  // Back to an earlier or later state: the next change starts a new step
  function jump(target: Logo) {
    last = null
    logo.value = target
    write(target)
  }

  function undo() {
    const previous = past.value.at(-1)
    if (!previous) return
    past.value = past.value.slice(0, -1)
    future.value = [...future.value, logo.value]
    jump(previous)
  }

  function redo() {
    const next = future.value.at(-1)
    if (!next) return
    future.value = future.value.slice(0, -1)
    past.value = [...past.value, logo.value]
    jump(next)
  }

  // A saved design: copied, so that later changes do not touch the gallery
  function load(design: Logo) {
    set(copyLogo(design))
  }

  // The dice explore the geometry: the user's colours and filter stay
  function shuffle() {
    const { shapes, background, filter, cells, gap } = logo.value
    const next = randomLogo()
    set({
      ...next,
      shapes: next.shapes.map((s, i) => ({ ...s, color: shapes[i]?.color ?? null })),
      background,
      filter,
      cells,
      gap
    })
  }

  return { logo, ready, canUndo, canRedo, patch, toggleShape, setColor, setShape, load, shuffle, undo, redo }
}
