<script setup lang="ts">
import AdminPage from '../components/AdminPage.vue'
import AuthPage from '../components/AuthPage.vue'
import BookCatalog from '../components/BookCatalog.vue'
import HomePage from '../components/HomePage.vue'
import MiscLibraryPage from '../components/MiscLibraryPage.vue'

const route = useRoute()
const pageName = computed(() => {
  const slug = route.params.slug
  const path = Array.isArray(slug) ? slug.join('/') : slug || 'index'
  return path.replace(/^perpustakaan-digital-ui\//, '').replace(/\.html$/, '')
})

const view = computed(() => {
  if (pageName.value === 'index') return HomePage
  if (pageName.value === 'semua-buku' || pageName.value === 'kategori') return BookCatalog
  if (['masuk', 'daftar', 'lupa-sandi'].includes(pageName.value)) return AuthPage
  if (pageName.value.startsWith('admin/')) return AdminPage
  if (['buku-detail', 'favorit', 'ai-ringkas', 'usulkan-buku', 'sumbangkan-buku', 'pdf-viewer'].includes(pageName.value)) return MiscLibraryPage
  return null
})
</script>

<template>
  <component :is="view" v-if="view" :page="pageName" />
  <main v-else class="container section"><h1>Halaman tidak ditemukan</h1><NuxtLink to="/">Kembali ke beranda</NuxtLink></main>
</template>