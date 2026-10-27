<script setup lang="ts">
const props = defineProps<{ logo: Logo }>()
const emit = defineEmits<{
  patch: [changes: Partial<Logo>]
  shuffle: []
  reset: []
}>()

type SliderKey = keyof typeof LOGO_LIMITS

interface Slider {
  key: SliderKey
  label: string
  text: string
}

const COPIED_MS = 1500

const LAYOUTS = [
  { id: 'circle', label: 'Rond', icon: 'i-lucide-circle-dashed' },
  { id: 'square', label: 'Carré', icon: 'i-lucide-grid-3x3' }
] as const

const PAINTS = [
  { id: 'fill', label: 'Plein', icon: 'i-lucide-paint-bucket' },
  { id: 'stroke', label: 'Contour', icon: 'i-lucide-pen-line' }
] as const

const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | undefined

const sliders = computed<Slider[]>(() => {
  const { logo } = props
  const count: Slider = logo.layout === 'circle'
    ? { key: 'circleCount', label: 'Copies', text: String(logo.circleCount) }
    : { key: 'gridSize', label: 'Grille', text: `${logo.gridSize} × ${logo.gridSize}` }
  return [
    count,
    { key: 'spread', label: 'Écart', text: `${Math.round(logo.spread * 100)} %` },
    { key: 'size', label: 'Taille', text: `${Math.round(logo.size * 100)} %` },
    { key: 'rotation', label: 'Rotation', text: `${logo.rotation}°` },
    { key: 'twist', label: 'Torsion', text: `${logo.twist}°` }
  ]
})

function onSlide(key: SliderKey, value: number | number[] | undefined) {
  if (typeof value === 'number') emit('patch', { [key]: value })
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

onBeforeUnmount(() => clearTimeout(copiedTimer))
</script>

<template>
  <aside
    aria-label="Réglages"
    class="absolute inset-x-4 bottom-4 flex max-h-[45dvh] flex-col gap-5 overflow-y-auto rounded-3xl border border-default bg-default p-4 md:inset-x-auto md:top-4 md:right-4 md:max-h-none md:w-72"
  >
    <header class="flex items-center justify-between">
      <h1 class="text-sm font-medium text-highlighted">
        Clogo
      </h1>
      <div class="flex">
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
      </div>
    </header>

    <div
      role="group"
      aria-label="Forme"
      class="grid grid-cols-4 gap-1"
    >
      <UButton
        v-for="id in SHAPE_IDS"
        :key="id"
        color="neutral"
        :variant="logo.shape === id ? 'soft' : 'ghost'"
        :aria-label="SHAPES[id].label"
        :aria-pressed="logo.shape === id"
        class="aspect-square h-auto w-full justify-center"
        @click="emit('patch', { shape: id })"
      >
        <svg
          viewBox="-50 -50 100 100"
          fill="currentColor"
          aria-hidden="true"
          class="size-5"
        >
          <path :d="SHAPES[id].d" />
        </svg>
      </UButton>
    </div>

    <div class="flex flex-col gap-1">
      <div
        role="group"
        aria-label="Disposition"
        class="grid grid-cols-2 gap-1"
      >
        <UButton
          v-for="layout in LAYOUTS"
          :key="layout.id"
          color="neutral"
          size="sm"
          :variant="logo.layout === layout.id ? 'soft' : 'ghost'"
          :icon="layout.icon"
          :label="layout.label"
          :aria-pressed="logo.layout === layout.id"
          class="justify-center"
          @click="emit('patch', { layout: layout.id })"
        />
      </div>
      <div
        role="group"
        aria-label="Peinture"
        class="grid grid-cols-2 gap-1"
      >
        <UButton
          v-for="paint in PAINTS"
          :key="paint.id"
          color="neutral"
          size="sm"
          :variant="logo.paint === paint.id ? 'soft' : 'ghost'"
          :icon="paint.icon"
          :label="paint.label"
          :aria-pressed="logo.paint === paint.id"
          class="justify-center"
          @click="emit('patch', { paint: paint.id })"
        />
      </div>
    </div>

    <div class="flex flex-col gap-4">
      <div
        v-for="slider in sliders"
        :key="slider.key"
        class="flex flex-col gap-2"
      >
        <div class="flex items-baseline justify-between">
          <span class="text-xs text-muted">{{ slider.label }}</span>
          <span class="text-xs text-highlighted tabular-nums">{{ slider.text }}</span>
        </div>
        <USlider
          color="neutral"
          size="sm"
          :aria-label="slider.label"
          :min="LOGO_LIMITS[slider.key].min"
          :max="LOGO_LIMITS[slider.key].max"
          :step="LOGO_LIMITS[slider.key].step"
          :model-value="logo[slider.key]"
          @update:model-value="onSlide(slider.key, $event)"
        />
      </div>
    </div>

    <div class="flex gap-1 md:mt-auto">
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
