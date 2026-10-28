const STORAGE_KEY = 'c-logo:designs:v1'
export const MAX_DESIGNS = 100
const FLASH_MS = 600
const SAVED_MS = 1500

// An entry without a text id or a numeric date is dropped; its logo is validated like the current one
function read(): Design[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const data: unknown = raw ? JSON.parse(raw) : []
    if (!Array.isArray(data)) return []
    return data
      .filter(item => typeof item?.id === 'string' && typeof item.savedAt === 'number')
      .map(item => ({ id: item.id, logo: parseLogo(item.logo), savedAt: item.savedAt }))
      .slice(0, MAX_DESIGNS)
  } catch {
    return []
  }
}

function write(designs: Design[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(designs))
  } catch {
    // stockage plein ou indisponible : on garde la galerie en mémoire
  }
}

export function useDesigns() {
  // Most recent first
  const designs = useState<Design[]>('designs', () => [])
  // Id of the design whose thumbnail blinks: the one a duplicate save did not add
  const flash = useState<string | null>('designs-flash', () => null)
  // True for a moment after a save (new or already there): feedback when the gallery is closed
  const saved = useState('designs-saved', () => false)
  const full = computed(() => designs.value.length >= MAX_DESIGNS)
  let flashTimer: ReturnType<typeof setTimeout> | undefined
  let savedTimer: ReturnType<typeof setTimeout> | undefined

  onMounted(() => {
    designs.value = read()
  })

  onBeforeUnmount(() => {
    clearTimeout(flashTimer)
    clearTimeout(savedTimer)
  })

  function confirmSaved() {
    saved.value = true
    clearTimeout(savedTimer)
    savedTimer = setTimeout(() => {
      saved.value = false
    }, SAVED_MS)
  }

  function save(logo: Logo) {
    const same = designs.value.find(d => sameLogo(d.logo, logo))
    if (same) {
      flash.value = same.id
      clearTimeout(flashTimer)
      flashTimer = setTimeout(() => {
        flash.value = null
      }, FLASH_MS)
      confirmSaved()
      return
    }
    if (full.value) return
    designs.value = [{ id: crypto.randomUUID(), logo: copyLogo(logo), savedAt: Date.now() }, ...designs.value]
    write(designs.value)
    confirmSaved()
  }

  function remove(id: string) {
    designs.value = designs.value.filter(d => d.id !== id)
    write(designs.value)
  }

  return { designs, flash, saved, full, save, remove }
}
