<script setup lang="ts">
const { logo, ready, patch, reset, shuffle } = useLogo()
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
      @shuffle="shuffle"
      @reset="reset"
    />
  </main>
</template>
