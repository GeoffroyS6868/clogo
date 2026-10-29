<script setup lang="ts">
defineProps<{ logo: Logo }>()
const emit = defineEmits<{
  patch: [changes: Partial<Logo>]
  setColor: [slot: number, color: string | null]
}>()
</script>

<template>
  <div class="flex flex-col gap-4">
    <section class="flex flex-col gap-2">
      <h2 class="text-xs text-muted">
        Fond
      </h2>
      <div class="flex items-center gap-2">
        <ColorSwatch
          :color="logo.background"
          label="Couleur du fond"
          @change="emit('patch', { background: $event })"
        />
        <UButton
          color="neutral"
          size="xs"
          :variant="logo.background === null ? 'soft' : 'ghost'"
          icon="i-lucide-ban"
          label="Transparent"
          :aria-pressed="logo.background === null"
          @click="logo.background !== null && emit('patch', { background: null })"
        />
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="text-xs text-muted">
        Formes
      </h2>
      <ul class="flex flex-col gap-2">
        <li
          v-for="(shape, i) in logo.shapes"
          :key="shape.id"
          class="flex items-center gap-2"
        >
          <svg
            viewBox="-50 -50 100 100"
            fill="currentColor"
            aria-hidden="true"
            class="size-5 shrink-0 text-highlighted"
          >
            <path :d="shapePath(shape, logo.corner, logo.smooth)" />
          </svg>
          <span class="flex-1 text-xs text-highlighted">{{ SHAPES[shape.id].label }}</span>
          <ColorSwatch
            :color="shape.color"
            :label="`Couleur de ${SHAPES[shape.id].label}`"
            @change="emit('setColor', i, $event)"
          />
          <UButton
            color="neutral"
            size="xs"
            :variant="shape.color === null ? 'soft' : 'ghost'"
            label="Auto"
            :aria-pressed="shape.color === null"
            @click="shape.color !== null && emit('setColor', i, null)"
          />
        </li>
      </ul>
    </section>
  </div>
</template>
