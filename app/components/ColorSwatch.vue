<script setup lang="ts">
defineProps<{ color: string | null, label: string }>()
const emit = defineEmits<{ change: [color: string] }>()

function onInput(event: Event) {
  if (event.target instanceof HTMLInputElement) emit('change', event.target.value)
}
</script>

<template>
  <label
    data-swatch
    class="relative inline-flex size-7 shrink-0 cursor-pointer overflow-hidden rounded-full border border-default has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-inverted"
    :style="{ backgroundColor: color ?? undefined }"
  >
    <input
      type="color"
      class="sr-only"
      :value="color ?? '#000000'"
      :aria-label="label"
      @input="onInput"
    >
    <svg
      v-if="!color"
      viewBox="0 0 28 28"
      aria-hidden="true"
      class="size-full text-muted"
    >
      <line
        x1="4"
        y1="24"
        x2="24"
        y2="4"
        stroke="currentColor"
        stroke-width="1.5"
      />
    </svg>
  </label>
</template>

<style scoped>
[data-swatch] {
  transition: background-color 0.2s;
}

@media (prefers-reduced-motion: reduce) {
  [data-swatch] {
    transition: none;
  }
}
</style>
