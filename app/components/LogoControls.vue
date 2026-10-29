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
  setShape: [slot: number, changes: ShapeChanges]
  undo: []
  redo: []
  shuffle: []
  save: []
  load: [logo: Logo]
  remove: [id: string]
}>()

const COPIED_MS = 1500

const TABS = [
  { id: 'shape', label: 'Forme' },
  { id: 'layout', label: 'Disposition' },
  { id: 'color', label: 'Couleur' }
] as const

type TabId = typeof TABS[number]['id']

const tab = ref<TabId>('shape')
const gallery = ref(false)
// The shortcut shown in the labels: only known on the client
const mod = ref('Ctrl')
const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | undefined

const tabId = (id: TabId) => `tab-${id}`

// Which way the incoming panel slides in; null when it should not (first display, back from the gallery)
const slide = ref<'next' | 'prev' | null>(null)
watch(tab, (now, before) => {
  slide.value = TABS.findIndex(t => t.id === now) > TABS.findIndex(t => t.id === before) ? 'next' : 'prev'
}, { flush: 'sync' })
watch(gallery, () => {
  slide.value = null
})

// One indicator slides behind the tabs; its box is measured from the active tab
const tablist = ref<HTMLElement>()
const bar = ref({ x: 0, width: 0 })
const measured = ref(false)
// Off until the first measure has been painted, so the indicator is placed, not animated
const ready = ref(false)

function measure() {
  const el = document.getElementById(tabId(tab.value))
  if (!tablist.value || !el || !el.offsetWidth) return
  // Fractional box: the tabs share the row with flex-auto, so offsetLeft / offsetWidth would be off by up to half a pixel
  const box = el.getBoundingClientRect()
  const x = box.left - tablist.value.getBoundingClientRect().left
  if (bar.value.x !== x || bar.value.width !== box.width) bar.value = { x, width: box.width }
  measured.value = true
}

let observer: ResizeObserver | undefined

// The tablist is recreated when coming back from the gallery
watch(tablist, (el) => {
  ready.value = false
  observer?.disconnect()
  if (!el) return
  measure()
  observer ??= new ResizeObserver(measure)
  observer.observe(el)
  el.querySelectorAll('[role=tab]').forEach(t => observer?.observe(t))
  requestAnimationFrame(() => {
    ready.value = true
  })
}, { flush: 'post' })

watch(tab, measure, { flush: 'post' })

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

onBeforeUnmount(() => {
  clearTimeout(copiedTimer)
  observer?.disconnect()
})
</script>

<template>
  <aside
    aria-label="Réglages"
    class="absolute inset-x-4 bottom-4 flex max-h-[45dvh] flex-col gap-4 rounded-3xl border border-default bg-default p-4 md:inset-x-auto md:top-4 md:right-4 md:max-h-none md:w-72"
  >
    <header class="flex items-center justify-between">
      <h1 class="sr-only">
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
      </div>
      <div class="flex items-center">
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
      ref="tablist"
      role="tablist"
      aria-label="Sections"
      class="relative flex gap-1"
      @keydown="onTabKey"
    >
      <span
        aria-hidden="true"
        data-indicator
        :data-ready="ready || undefined"
        :style="{ transform: `translateX(${bar.x}px)`, width: `${bar.width}px` }"
        class="absolute inset-y-0 left-0 rounded-md bg-elevated"
      />
      <UButton
        v-for="t in TABS"
        :id="tabId(t.id)"
        :key="t.id"
        color="neutral"
        size="sm"
        variant="ghost"
        :label="t.label"
        role="tab"
        :aria-selected="tab === t.id"
        :aria-controls="`panel-${t.id}`"
        :tabindex="tab === t.id ? 0 : -1"
        :class="tab === t.id ? ['text-highlighted', { 'bg-elevated': !measured }] : ''"
        class="relative flex-auto justify-center"
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
      :key="tab"
      role="tabpanel"
      :aria-labelledby="tabId(tab)"
      :data-slide="slide ?? undefined"
      class="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 py-1"
    >
      <LogoShapeTab
        v-if="tab === 'shape'"
        :logo="logo"
        @patch="emit('patch', $event)"
        @toggle-shape="emit('toggleShape', $event)"
        @set-shape="(slot, changes) => emit('setShape', slot, changes)"
      />
      <LogoLayoutTab
        v-else-if="tab === 'layout'"
        :logo="logo"
        @patch="emit('patch', $event)"
      />
      <LogoColorTab
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

<style scoped>
[data-indicator][data-ready] {
  transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), width 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

[data-slide] {
  animation: slide-in 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

[data-slide='next'] {
  --slide-from: 12px;
}

[data-slide='prev'] {
  --slide-from: -12px;
}

@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateX(var(--slide-from));
  }
}

@media (prefers-reduced-motion: reduce) {
  [data-indicator][data-ready] {
    transition: none;
  }

  [data-slide] {
    animation: none;
  }
}
</style>
