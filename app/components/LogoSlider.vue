<script setup lang="ts">
defineProps<{
  label: string
  text: string
  min: number
  max: number
  step: number
  modelValue: number
}>()
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()
const { start } = useScrub()

function onSlide(value: number | number[] | undefined) {
  if (typeof value === 'number') emit('update:modelValue', value)
}

// A bar, not a track and thumb: the track is the whole bar, the range is the fill,
// and the thumb is zero-sized (still focusable, so Reka UI keeps the keyboard and
// ARIA behaviour, and no in-bounds offset is left to shift anything at the ends).
const BAR_UI = {
  root: 'h-8 cursor-ew-resize',
  track: 'h-full rounded-md bg-elevated',
  range: 'rounded-none bg-accented',
  thumb: 'size-0 bg-transparent ring-0 outline-none focus-visible:outline-none'
}
</script>

<template>
  <div
    class="group relative h-8 rounded-md"
    @pointerdown="start"
  >
    <USlider
      color="neutral"
      :ui="BAR_UI"
      :aria-label="label"
      :min="min"
      :max="max"
      :step="step"
      :model-value="modelValue"
      @update:model-value="onSlide"
    />
    <span
      aria-hidden="true"
      data-veil
      class="pointer-events-none absolute inset-0 rounded-md bg-inverted/5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-active:opacity-100"
    />
    <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-default">
      {{ label }}
    </span>
    <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 font-mono text-sm text-highlighted tabular-nums">
      {{ text }}
    </span>
  </div>
</template>
