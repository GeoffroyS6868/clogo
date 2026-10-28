<script setup lang="ts">
const props = defineProps<{ logo: Logo }>()
const emit = defineEmits<{ patch: [changes: Partial<Logo>] }>()

const LAYOUT_BUTTONS = [
  { id: 'circle', label: 'Rond', icon: 'i-lucide-circle-dashed' },
  { id: 'grid', label: 'Grille', icon: 'i-lucide-grid-3x3' },
  { id: 'triangle', label: 'Triangle', icon: 'i-lucide-triangle' },
  { id: 'rays', label: 'Rayons', icon: 'i-lucide-asterisk' }
] as const

const CROSS_RAYS = 4

// The ring slider moves by whole turns of the shapes sequence
const shapeCount = computed(() => props.logo.shapes.length)
</script>

<template>
  <div class="flex flex-col gap-4">
    <div
      role="group"
      aria-label="Disposition"
      class="grid grid-cols-2 gap-1"
    >
      <UButton
        v-for="layout in LAYOUT_BUTTONS"
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

    <div class="flex flex-col gap-1">
      <LogoSlider
        v-if="logo.layout === 'circle'"
        label="Copies"
        :text="String(logo.circleCount)"
        :min="minCircleCount(shapeCount)"
        :max="LOGO_LIMITS.circleCount.max"
        :step="shapeCount"
        :model-value="logo.circleCount"
        @update:model-value="emit('patch', { circleCount: $event })"
      />
      <LogoSlider
        v-else-if="logo.layout === 'grid'"
        label="Grille"
        :text="`${logo.gridSize} × ${logo.gridSize}`"
        v-bind="LOGO_LIMITS.gridSize"
        :model-value="logo.gridSize"
        @update:model-value="emit('patch', { gridSize: $event })"
      />
      <LogoSlider
        v-else-if="logo.layout === 'triangle'"
        label="Rangées"
        :text="String(logo.triangleRows)"
        v-bind="LOGO_LIMITS.triangleRows"
        :model-value="logo.triangleRows"
        @update:model-value="emit('patch', { triangleRows: $event })"
      />
      <template v-else>
        <LogoSlider
          label="Branches"
          :text="logo.rayCount === CROSS_RAYS ? `${CROSS_RAYS} · croix` : String(logo.rayCount)"
          v-bind="LOGO_LIMITS.rayCount"
          :model-value="logo.rayCount"
          @update:model-value="emit('patch', { rayCount: $event })"
        />
        <LogoSlider
          label="Longueur"
          :text="String(logo.rayLength)"
          v-bind="LOGO_LIMITS.rayLength"
          :model-value="logo.rayLength"
          @update:model-value="emit('patch', { rayLength: $event })"
        />
      </template>
      <LogoSlider
        label="Écart"
        :text="`${Math.round(spreadOf(logo) * 100)} %`"
        v-bind="LOGO_LIMITS.spread"
        :min="minSpread(logo.layout)"
        :model-value="spreadOf(logo)"
        @update:model-value="emit('patch', { spread: $event })"
      />
      <LogoSlider
        label="Torsion"
        :text="`${logo.twist}°`"
        v-bind="LOGO_LIMITS.twist"
        :model-value="logo.twist"
        @update:model-value="emit('patch', { twist: $event })"
      />
    </div>
  </div>
</template>
