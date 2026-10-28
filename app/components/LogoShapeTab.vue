<script setup lang="ts">
const props = defineProps<{ logo: Logo }>()
const emit = defineEmits<{
  patch: [changes: Partial<Logo>]
  toggleShape: [id: ShapeId]
}>()

const PAINTS = [
  { id: 'fill', label: 'Plein', icon: 'i-lucide-paint-bucket' },
  { id: 'stroke', label: 'Contour', icon: 'i-lucide-pen-line' }
] as const

const CORNERS = [
  { smooth: false, label: 'Arrondis', icon: 'i-lucide-square-round-corner' },
  { smooth: true, label: 'Squircle', icon: 'i-lucide-squircle' }
] as const

const hasAngles = computed(() => props.logo.shapes.some(s => isAngular(s.id)))

// Position in the selection, shown only when it matters (two shapes or more)
const order = (id: ShapeId) => props.logo.shapes.findIndex(s => s.id === id)
const chosen = (id: ShapeId) => order(id) !== -1
</script>

<template>
  <div class="flex flex-col gap-4">
    <div
      role="group"
      aria-label="Formes"
      class="grid grid-cols-4 gap-1"
    >
      <UButton
        v-for="id in SHAPE_IDS"
        :key="id"
        color="neutral"
        :variant="chosen(id) ? 'soft' : 'ghost'"
        :aria-label="SHAPES[id].label"
        :aria-pressed="chosen(id)"
        class="relative aspect-square h-auto w-full justify-center"
        @click="emit('toggleShape', id)"
      >
        <svg
          viewBox="-50 -50 100 100"
          fill="currentColor"
          aria-hidden="true"
          class="size-5"
        >
          <path :d="shapePath(id, logo.corner, logo.smooth)" />
        </svg>
        <span
          v-if="chosen(id) && logo.shapes.length > 1"
          aria-hidden="true"
          class="absolute top-1 right-1.5 text-[10px] leading-none text-muted"
        >{{ order(id) + 1 }}</span>
      </UButton>
    </div>

    <div class="flex flex-col gap-1">
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
      <div
        v-if="hasAngles"
        role="group"
        aria-label="Coins"
        class="grid grid-cols-2 gap-1"
      >
        <UButton
          v-for="corner in CORNERS"
          :key="corner.label"
          color="neutral"
          size="sm"
          :variant="logo.smooth === corner.smooth ? 'soft' : 'ghost'"
          :icon="corner.icon"
          :label="corner.label"
          :aria-pressed="logo.smooth === corner.smooth"
          class="justify-center"
          @click="emit('patch', { smooth: corner.smooth })"
        />
      </div>
    </div>

    <div class="flex flex-col gap-1">
      <LogoSlider
        v-if="hasAngles"
        label="Arrondi"
        :text="`${Math.round(logo.corner * 100)} %`"
        v-bind="LOGO_LIMITS.corner"
        :model-value="logo.corner"
        @update:model-value="emit('patch', { corner: $event })"
      />
      <LogoSlider
        label="Taille"
        :text="`${Math.round(logo.size * 100)} %`"
        v-bind="LOGO_LIMITS.size"
        :model-value="logo.size"
        @update:model-value="emit('patch', { size: $event })"
      />
      <LogoSlider
        label="Rotation"
        :text="`${logo.rotation}°`"
        v-bind="LOGO_LIMITS.rotation"
        :model-value="logo.rotation"
        @update:model-value="emit('patch', { rotation: $event })"
      />
    </div>
  </div>
</template>
