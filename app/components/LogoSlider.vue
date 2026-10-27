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

function onSlide(value: number | number[] | undefined) {
  if (typeof value === 'number') emit('update:modelValue', value)
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center justify-between">
      <span class="text-xs text-muted">{{ label }}</span>
      <span class="flex items-center gap-2">
        <slot />
        <span class="text-xs text-highlighted tabular-nums">{{ text }}</span>
      </span>
    </div>
    <USlider
      color="neutral"
      size="sm"
      :aria-label="label"
      :min="min"
      :max="max"
      :step="step"
      :model-value="modelValue"
      @update:model-value="onSlide"
    />
  </div>
</template>
