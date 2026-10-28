<script setup lang="ts">
defineProps<{ logo: Logo, ready: boolean }>()
</script>

<template>
  <div class="absolute inset-x-0 top-0 bottom-[calc(45dvh+1rem)] flex items-center justify-center [container-type:size] md:inset-y-0 md:right-76">
    <div
      data-surface
      class="squircle aspect-square w-[calc(min(100cqw,100cqh)-4rem)] border border-default bg-elevated"
      :style="{ backgroundColor: logo.background ?? undefined }"
      :data-ready="ready ? '' : undefined"
    >
      <LogoArt
        :logo="logo"
        animated
        :ready="ready"
        role="img"
        aria-label="Aperçu du logo"
        class="size-full text-highlighted"
      />
    </div>
  </div>
</template>

<style scoped>
[data-surface][data-ready] {
  transition: background-color 0.2s;
}

@media (prefers-reduced-motion: reduce) {
  [data-surface][data-ready] {
    transition: none;
  }
}
</style>
