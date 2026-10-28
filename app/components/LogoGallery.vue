<script setup lang="ts">
const props = defineProps<{
  logo: Logo
  designs: Design[]
  flash: string | null
  full: boolean
}>()
const emit = defineEmits<{
  save: []
  load: [logo: Logo]
  remove: [id: string]
}>()

const CONFIRM_MS = 3000

const confirming = ref<string | null>(null)
const grid = useTemplateRef('grid')
let confirmTimer: ReturnType<typeof setTimeout> | undefined

const label = (design: Design) => `Charger le design du ${new Date(design.savedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}`

// First click arms the button for a few seconds, the second one deletes
function onRemove(id: string) {
  clearTimeout(confirmTimer)
  if (confirming.value === id) {
    confirming.value = null
    emit('remove', id)
    return
  }
  confirming.value = id
  confirmTimer = setTimeout(() => {
    confirming.value = null
  }, CONFIRM_MS)
}

// The design a duplicate save pointed to may be out of sight
watch(() => props.flash, async (id) => {
  if (!id) return
  await nextTick()
  grid.value?.querySelector(`[data-id="${id}"]`)?.scrollIntoView({ block: 'nearest' })
})

onBeforeUnmount(() => clearTimeout(confirmTimer))
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="text-xs text-muted">
        Mes designs
      </h2>
      <span class="text-xs text-muted tabular-nums">{{ designs.length }} / {{ MAX_DESIGNS }}</span>
    </div>
    <UButton
      color="neutral"
      variant="soft"
      icon="i-lucide-bookmark-plus"
      :label="full ? 'Galerie pleine' : 'Enregistrer ce design'"
      :disabled="full"
      class="w-full justify-center"
      @click="emit('save')"
    />
    <p
      v-if="!designs.length"
      class="text-center text-sm text-muted"
    >
      Aucun design enregistré.
    </p>
    <ul
      v-else
      ref="grid"
      class="-m-1.5 grid min-h-0 flex-1 grid-cols-3 content-start gap-2 overflow-y-auto p-1.5"
    >
      <li
        v-for="design in designs"
        :key="design.id"
        :data-id="design.id"
        class="group relative"
      >
        <button
          type="button"
          :aria-label="label(design)"
          data-thumb
          :data-flash="flash === design.id ? '' : undefined"
          class="block aspect-square w-full cursor-pointer overflow-hidden rounded-2xl border border-default bg-elevated text-highlighted [corner-shape:squircle] focus-visible:outline-2 focus-visible:outline-inverted"
          :class="sameLogo(design.logo, logo) ? 'outline-2 outline-inverted' : ''"
          :style="{ backgroundColor: design.logo.background ?? undefined }"
          @click="emit('load', design.logo)"
        >
          <LogoArt
            :logo="design.logo"
            aria-hidden="true"
            class="size-full"
          />
        </button>
        <UButton
          color="neutral"
          variant="soft"
          size="xs"
          :icon="confirming === design.id ? 'i-lucide-check' : 'i-lucide-x'"
          :aria-label="confirming === design.id ? 'Confirmer la suppression' : 'Supprimer le design'"
          class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
          :class="confirming === design.id ? 'opacity-100' : ''"
          @click="onRemove(design.id)"
        />
      </li>
    </ul>
  </div>
</template>

<style scoped>
/* A duplicate is always the current logo, already outlined: the ring flies outwards instead of blinking */
[data-flash] {
  animation: flash 0.6s;
}

@keyframes flash {
  from {
    outline: 2px solid var(--ui-border-inverted);
    outline-offset: 0;
  }

  to {
    outline: 2px solid transparent;
    outline-offset: 4px;
  }
}

@media (prefers-reduced-motion: reduce) {
  [data-flash] {
    animation: none;
    outline: 2px solid var(--ui-border-inverted);
    outline-offset: 3px;
  }
}
</style>
