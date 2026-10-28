<script setup lang="ts">
const props = defineProps<{
  logo: Logo
  designs: Design[]
  flash: string | null
  saved: boolean
  full: boolean
  canUndo: boolean
  canRedo: boolean
}>()
const emit = defineEmits<{
  patch: [changes: Partial<Logo>]
  toggleShape: [id: ShapeId]
  setColor: [slot: number, color: string | null]
  undo: []
  redo: []
  shuffle: []
  reset: []
  save: []
  load: [logo: Logo]
  remove: [id: string]
}>()

const COPIED_MS = 1500

const TABS = [
  { id: 'shape', label: 'Forme' },
  { id: 'layout', label: 'Disposition' },
  { id: 'render', label: 'Rendu' }
] as const

type TabId = typeof TABS[number]['id']

const tab = ref<TabId>('shape')
const gallery = ref(false)
// The shortcut shown in the labels: only known on the client
const mod = ref('Ctrl')
const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | undefined

const tabId = (id: TabId) => `tab-${id}`

// Left / right move between tabs, wrapping around; the focus follows
function onTabKey(event: KeyboardEvent) {
  const dir = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
  if (!dir) return
  event.preventDefault()
  const index = TABS.findIndex(t => t.id === tab.value)
  const next = TABS[(index + dir + TABS.length) % TABS.length]
  if (!next) return
  tab.value = next.id
  nextTick(() => document.getElementById(tabId(next.id))?.focus())
}

async function onCopy() {
  try {
    await copySvg(props.logo)
  } catch {
    return
  }
  copied.value = true
  clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => {
    copied.value = false
  }, COPIED_MS)
}

onMounted(() => {
  if (/Mac/.test(navigator.userAgent)) mod.value = '⌘'
})

onBeforeUnmount(() => clearTimeout(copiedTimer))
</script>

<template>
  <aside
    aria-label="Réglages"
    class="absolute inset-x-4 bottom-4 flex max-h-[45dvh] flex-col gap-4 rounded-3xl border border-default bg-default p-4 md:inset-x-auto md:top-4 md:right-4 md:max-h-none md:w-72"
  >
    <header class="flex items-center justify-between">
      <h1 class="text-sm font-medium text-highlighted">
        c-logo
      </h1>
      <div class="flex items-center">
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-undo-2"
          :aria-label="`Annuler (${mod}+Z)`"
          :disabled="!canUndo"
          @click="emit('undo')"
        />
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-redo-2"
          :aria-label="`Rétablir (${mod}+Maj+Z)`"
          :disabled="!canRedo"
          @click="emit('redo')"
        />
        <div
          aria-hidden="true"
          class="mx-1 h-4 w-px bg-(--ui-border)"
        />
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-shuffle"
          aria-label="Aléatoire"
          @click="emit('shuffle')"
        />
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-rotate-ccw"
          aria-label="Réinitialiser"
          @click="emit('reset')"
        />
        <UButton
          color="neutral"
          :variant="gallery ? 'soft' : 'ghost'"
          size="sm"
          :icon="saved && !gallery ? 'i-lucide-check' : 'i-lucide-library'"
          aria-label="Mes designs"
          :aria-pressed="gallery"
          @click="gallery = !gallery"
        />
      </div>
    </header>

    <div
      v-if="!gallery"
      role="tablist"
      aria-label="Sections"
      class="flex gap-1"
      @keydown="onTabKey"
    >
      <UButton
        v-for="t in TABS"
        :id="tabId(t.id)"
        :key="t.id"
        color="neutral"
        size="sm"
        :variant="tab === t.id ? 'soft' : 'ghost'"
        :label="t.label"
        role="tab"
        :aria-selected="tab === t.id"
        :aria-controls="`panel-${t.id}`"
        :tabindex="tab === t.id ? 0 : -1"
        class="flex-auto justify-center"
        @click="tab = t.id"
      />
    </div>

    <LogoGallery
      v-if="gallery"
      :logo="logo"
      :designs="designs"
      :flash="flash"
      :full="full"
      @save="emit('save')"
      @load="emit('load', $event)"
      @remove="emit('remove', $event)"
    />
    <div
      v-else
      :id="`panel-${tab}`"
      role="tabpanel"
      :aria-labelledby="tabId(tab)"
      class="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 py-1"
    >
      <LogoShapeTab
        v-if="tab === 'shape'"
        :logo="logo"
        @patch="emit('patch', $event)"
        @toggle-shape="emit('toggleShape', $event)"
      />
      <LogoLayoutTab
        v-else-if="tab === 'layout'"
        :logo="logo"
        @patch="emit('patch', $event)"
      />
      <LogoRenderTab
        v-else
        :logo="logo"
        @patch="emit('patch', $event)"
        @set-color="(slot, color) => emit('setColor', slot, color)"
      />
    </div>

    <div class="flex gap-1">
      <UButton
        color="neutral"
        variant="solid"
        icon="i-lucide-download"
        label="SVG"
        class="flex-1 justify-center"
        @click="downloadSvg(logo)"
      />
      <UButton
        color="neutral"
        variant="solid"
        icon="i-lucide-download"
        label="PNG"
        class="flex-1 justify-center"
        @click="downloadPng(logo)"
      />
      <UButton
        color="neutral"
        variant="ghost"
        :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
        aria-label="Copier le SVG"
        @click="onCopy"
      />
    </div>
  </aside>
</template>
