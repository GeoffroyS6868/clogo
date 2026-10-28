// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  // Styles only for the Nuxt UI components the app uses (UApp, UButton, USlider), not the whole library
  ui: {
    experimental: {
      componentDetection: true
    }
  },

  routeRules: {
    '/': { prerender: true }
  },

  compatibilityDate: '2026-06-30',

  // Pre-compressed .br / .gz copies of every public asset, served when the browser accepts them
  nitro: {
    compressPublicAssets: true
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  // The few icons the app uses ship in the client bundle: no request to the icon API at runtime
  icon: {
    clientBundle: {
      scan: true
    }
  }
})
