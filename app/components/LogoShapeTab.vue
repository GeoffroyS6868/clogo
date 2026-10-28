<script setup lang="ts">
const props = defineProps<{ logo: Logo }>()
const emit = defineEmits<{
  patch: [changes: Partial<Logo>]
  toggleShape: [id: ShapeId]
  setShape: [slot: number, changes: ShapeChanges]
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
// The shape of a button: the chosen one with its own settings, otherwise the default one
const countOf = (slot: ShapeSlot) => slot.count ?? SHAPE_COUNT[slot.id]?.default ?? 0
const slotOf = (id: ShapeId) => props.logo.shapes[order(id)] ?? newSlot(id)

// The character field keeps the last character typed, so that one can replace without erasing.
// One that has no outline is refused: the old one stays and the row shakes.
const shaking = ref(false)

async function shake() {
  shaking.value = false
  await nextTick()
  shaking.value = true
}

function typeChar(event: Event, slot: number) {
  const input = event.target as HTMLInputElement
  // A dead key is still composing: wait for its character
  if (event instanceof InputEvent && event.isComposing) return
  const typed = [...input.value].at(-1)
  const current = props.logo.shapes[slot]?.char
  const known = typed !== undefined && Object.hasOwn(GLYPHS, typed)
  if (known && typed !== current) emit('setShape', slot, { char: typed })
  else if (typed !== undefined && !known) shake()
  // Whatever happened, the field shows the character that counts
  input.value = known ? typed : current ?? ''
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div
      role="group"
      aria-label="Formes"
      class="grid grid-cols-5 gap-1"
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
        <span
          v-if="id === 'glyph' && !chosen(id)"
          aria-hidden="true"
          class="text-sm font-semibold"
        >Aa</span>
        <svg
          v-else
          viewBox="-50 -50 100 100"
          fill="currentColor"
          aria-hidden="true"
          class="size-5"
        >
          <path :d="shapePath(slotOf(id), logo.corner, logo.smooth)" />
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
      <template
        v-for="(slot, i) in logo.shapes"
        :key="slot.id"
      >
        <LogoSlider
          v-if="SHAPE_COUNT[slot.id]"
          :label="SHAPE_COUNT[slot.id]!.label"
          :text="String(countOf(slot))"
          :min="SHAPE_COUNT[slot.id]!.min"
          :max="SHAPE_COUNT[slot.id]!.max"
          :step="1"
          :model-value="countOf(slot)"
          @update:model-value="emit('setShape', i, { count: $event })"
        />
        <label
          v-else-if="slot.id === 'glyph'"
          :data-shake="shaking ? '' : undefined"
          class="flex h-8 cursor-text items-center justify-between rounded-md bg-elevated pr-2 pl-3 text-sm text-default transition-colors focus-within:bg-accented hover:bg-accented"
          @animationend="shaking = false"
        >
          Caractère
          <input
            :value="slot.char"
            type="text"
            autocomplete="off"
            spellcheck="false"
            aria-label="Caractère"
            aria-describedby="char-help"
            class="w-10 bg-transparent text-center font-mono text-sm text-highlighted outline-none"
            @input="typeChar($event, i)"
            @compositionend="typeChar($event, i)"
            @focus="($event.target as HTMLInputElement).select()"
          >
          <span
            id="char-help"
            class="sr-only"
          >Lettres, chiffres et symboles courants.</span>
        </label>
      </template>
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

<style scoped>
[data-shake] {
  animation: shake 0.25s;
}

@keyframes shake {
  25% {
    transform: translateX(-4px);
  }

  75% {
    transform: translateX(4px);
  }
}

@media (prefers-reduced-motion: reduce) {
  [data-shake] {
    animation: none;
  }
}
</style>
