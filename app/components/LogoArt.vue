<script setup lang="ts">
import type { Mosaic } from '~/utils/mosaic'
import type { Copy } from '~/utils/replicate'

// animated: the work surface (transitions, fade-in, mosaic once per frame); otherwise a static thumbnail
const props = defineProps<{ logo: Logo, animated?: boolean, ready?: boolean }>()

const replica = computed(() => replicate(props.logo))
const paths = computed(() => props.logo.shapes.map(s => shapePath(s.id, props.logo.corner, props.logo.smooth)))

// Own colour of a copy, or undefined to inherit currentColor from the group
const colorOf = (c: Copy) => inkOf(props.logo, c.slot) ?? undefined

// Indices already on screen: only a copy that is new after the first frame fades in
const seen = new Set<number>()

function setCopy(i: number, el: unknown) {
  if (!(el instanceof SVGElement) || seen.has(i)) return
  seen.add(i)
  if (!props.ready) return
  el.setAttribute('data-appear', '')
  el.addEventListener('animationend', () => el.removeAttribute('data-appear'), { once: true })
}

watch(() => replica.value.copies.length, (count) => {
  for (const i of seen) if (i >= count) seen.delete(i)
})

// Cells of the filter. One raster pass is costly: when animated, at most one pass per frame, client side only.
const liveTiles = shallowRef<Mosaic | null>(null)
let frame = 0
let stop: (() => void) | undefined

function compute() {
  frame = 0
  liveTiles.value = mosaic(props.logo, rasterSampler(props.logo, replica.value))
}

// A change within the same frame joins the pass already scheduled
function schedule() {
  if (props.logo.filter === 'none') {
    cancelAnimationFrame(frame)
    frame = 0
    liveTiles.value = null
  } else if (!frame) {
    frame = requestAnimationFrame(compute)
  }
}

onMounted(() => {
  if (!props.animated) return
  schedule()
  stop = watch(() => props.logo, schedule)
})

onBeforeUnmount(() => {
  stop?.()
  cancelAnimationFrame(frame)
})

// A thumbnail has no transition to protect: its cells are computed right away
const staticTiles = computed(() =>
  props.animated || props.logo.filter === 'none'
    ? null
    : mosaic(props.logo, rasterSampler(props.logo, replica.value))
)
const tiles = computed(() => props.animated ? liveTiles.value : staticTiles.value)

const transform = (c: Copy) => `translate(${roundTo(c.x)}px, ${roundTo(c.y)}px) rotate(${roundTo(c.angle)}deg) scale(${roundTo(c.k, 4)})`
</script>

<template>
  <svg
    viewBox="-500 -500 1000 1000"
    :data-ready="animated && ready ? '' : undefined"
  >
    <g
      v-if="logo.filter === 'none'"
      data-fit
      :fill="logo.paint === 'fill' ? 'currentColor' : 'none'"
      :stroke="logo.paint === 'stroke' ? 'currentColor' : 'none'"
      :stroke-miterlimit="MITER_LIMIT"
      :style="{ transform: `scale(${roundTo(replica.fit, 4)})`, strokeWidth: roundTo(replica.strokeWidth) }"
    >
      <g
        v-for="(copy, i) in replica.copies"
        :key="i"
        :ref="(el: unknown) => setCopy(i, el)"
        data-copy
        :style="{ transform: transform(copy) }"
      >
        <path
          :d="paths[copy.slot]"
          :fill="logo.paint === 'fill' ? colorOf(copy) : undefined"
          :stroke="logo.paint === 'stroke' ? colorOf(copy) : undefined"
        />
      </g>
    </g>
    <g
      v-else-if="tiles"
      fill="currentColor"
    >
      <path
        v-for="tile in tiles.paths"
        :key="tile.slot"
        :d="tile.d"
        :fill="inkOf(logo, tile.slot) ?? undefined"
      />
    </g>
  </svg>
</template>

<style scoped>
svg[data-ready] path {
  transition: fill 0.2s, stroke 0.2s;
}

svg[data-ready] [data-fit] {
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), stroke-width 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

svg[data-ready] [data-copy] {
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

[data-appear] {
  animation: appear 0.3s;
}

@keyframes appear {
  from {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  svg[data-ready] path,
  svg[data-ready] [data-fit],
  svg[data-ready] [data-copy] {
    transition: none;
  }

  [data-appear] {
    animation: none;
  }
}
</style>
