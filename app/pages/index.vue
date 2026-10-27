<script setup lang="ts">
const { logo, ready, patch, toggleShape, setColor, reset, shuffle } = useLogo()
</script>

<template>
  <main class="relative h-dvh overflow-hidden bg-default">
    <LogoCanvas
      :logo="logo"
      :ready="ready"
    />
    <LogoControls
      :logo="logo"
      @patch="patch"
      @toggle-shape="toggleShape"
      @set-color="setColor"
      @shuffle="shuffle"
      @reset="reset"
    />
  </main>
</template>
