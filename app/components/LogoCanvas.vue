<script setup lang="ts">
import type { Copy } from '~/utils/replicate'

const props = defineProps<{ logo: Logo, ready: boolean }>()

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

const transform = (c: Copy) => `translate(${roundTo(c.x)}px, ${roundTo(c.y)}px) rotate(${roundTo(c.angle)}deg) scale(${roundTo(c.k, 4)})`
</script>

<template>
  <div class="absolute inset-x-0 top-0 bottom-[calc(45dvh+1rem)] flex items-center justify-center [container-type:size] md:inset-y-0 md:right-76">
    <div
      data-surface
      class="squircle aspect-square w-[calc(min(100cqw,100cqh)-4rem)] border border-default bg-elevated"
      :style="{ backgroundColor: logo.background ?? undefined }"
      :data-ready="ready ? '' : undefined"
    >
      <svg
        viewBox="-500 -500 1000 1000"
        role="img"
        aria-label="Aperçu du logo"
        class="size-full text-highlighted"
      >
        <g
          data-fit
          :fill="logo.paint === 'fill' ? 'currentColor' : 'none'"
          :stroke="logo.paint === 'stroke' ? 'currentColor' : 'none'"
          stroke-linejoin="round"
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
      </svg>
    </div>
  </div>
</template>

<style scoped>
[data-surface][data-ready] {
  transition: background-color 0.2s;
}

[data-ready] path {
  transition: fill 0.2s, stroke 0.2s;
}

[data-ready] [data-fit] {
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), stroke-width 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

[data-ready] [data-copy] {
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
  [data-surface][data-ready],
  [data-ready] path,
  [data-ready] [data-fit],
  [data-ready] [data-copy] {
    transition: none;
  }

  [data-appear] {
    animation: none;
  }
}
</style>
