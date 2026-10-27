<script setup lang="ts">
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'fr'
  }
})

useSeoMeta({
  title: 'c-logo',
  description: 'Créez un logo en répliquant une à trois formes en rond, en grille, en triangle ou en rayons, puis exportez-le en SVG ou en PNG.'
})
</script>

<template>
  <UApp>
    <NuxtPage />
  </UApp>
</template>
