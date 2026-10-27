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
  title: 'Clogo',
  description: 'Créez un logo en répliquant une forme en rond ou en carré, puis exportez-le en SVG ou en PNG.'
})
</script>

<template>
  <UApp>
    <NuxtPage />
  </UApp>
</template>
