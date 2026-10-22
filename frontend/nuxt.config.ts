import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:4000',
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  css: [
    '~/assets/css/tailwind.css',
    '~/assets/css/ui/style.css',
    '~/assets/css/ui/navbar.css',
    '~/assets/css/ui/home.css',
    '~/assets/css/ui/auth.css',
    '~/assets/css/ui/admin.css'
  ]
})