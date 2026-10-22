<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const searchQuery = ref(String(route.query.q || ''))
const searchOpen = ref(false)
const drawerOpen = ref(false)
const isScrolled = ref(false)
const theme = useState<'light' | 'dark'>('library-theme', () => 'light')
const { currentUser, logout } = useAuth()

const mainLinks = [
  { label: 'Beranda', to: '/' },
  { label: 'Semua Buku', to: '/semua-buku' },
  { label: 'Rangkuman Buku', to: '/ai-ringkas' },
]

onMounted(() => {
  const saved = localStorage.getItem('pdk-theme')
  theme.value = saved === 'dark' || saved === 'light'
    ? saved
    : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  document.documentElement.dataset.theme = theme.value
  updateScrollState()
  window.addEventListener('scroll', updateScrollState, { passive: true })
})

onBeforeUnmount(() => window.removeEventListener('scroll', updateScrollState))

watch(theme, value => {
  if (!import.meta.client) return
  document.documentElement.dataset.theme = value
  localStorage.setItem('pdk-theme', value)
})

function updateScrollState() {
  isScrolled.value = window.scrollY > 24
}

function isActive(to: string) {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}

function submitSearch() {
  const query = searchQuery.value.trim()
  if (query) router.push({ path: '/semua-buku', query: { q: query } })
  searchOpen.value = false
  drawerOpen.value = false
}

function signOut() {
  logout()
  drawerOpen.value = false
  router.push('/')
}
</script>

<template>
  <div class="navbar-shell">
    <header class="navbar" :class="{ 'navbar--scrolled': isScrolled }">
      <div class="navbar__inner">
        <button class="navbar__hamburger" type="button" aria-label="Buka menu navigasi" :aria-expanded="drawerOpen" @click="drawerOpen = true">
          <span /><span /><span />
        </button>
        <NuxtLink to="/" class="navbar__logo">
          <span class="navbar__logo-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22z"/><path d="M4 5.5v14A2.5 2.5 0 0 1 6.5 17H20"/></svg></span>
          <span><span class="navbar__logo-text">PerpusDa Karanganyar</span><span class="navbar__logo-sub">Perpustakaan Digital</span></span>
        </NuxtLink>
        <nav class="navbar__menu" aria-label="Navigasi utama">
          <NuxtLink v-for="link in mainLinks" :key="link.to" :to="link.to" class="navbar__link" :class="{ active: isActive(link.to) }">{{ link.label }}</NuxtLink>
        </nav>
        <div class="navbar__controls">
          <div class="navbar__search">
            <button class="navbar__search-toggle" type="button" aria-label="Buka pencarian" @click="searchOpen = !searchOpen">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </button>
            <form class="navbar__search-box" :class="{ open: searchOpen }" role="search" @submit.prevent="submitSearch">
              <svg class="navbar__search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input v-model="searchQuery" class="navbar__search-input" type="search" placeholder="Cari judul, penulis, atau ISBN…" autocomplete="off" aria-label="Cari buku" />
              <button v-if="searchOpen" class="navbar__search-close" type="button" aria-label="Tutup pencarian" @click="searchOpen = false"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 6-12 12M6 6l12 12"/></svg></button>
            </form>
          </div>
          <button class="navbar__theme-toggle" type="button" :aria-label="theme === 'dark' ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'" @click="theme = theme === 'dark' ? 'light' : 'dark'">
            <svg v-if="theme === 'dark'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          </button>
          <button v-if="currentUser" class="navbar__avatar" type="button" :aria-label="`Keluar dari akun ${currentUser.name}`" title="Keluar" @click="signOut">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></svg>
          </button>
          <NuxtLink v-else to="/masuk" class="navbar__avatar" aria-label="Masuk ke akun Anda" title="Masuk">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </NuxtLink>
        </div>
      </div>
    </header>

    <div class="drawer-overlay" :class="{ open: drawerOpen }" aria-hidden="true" @click="drawerOpen = false" />
    <aside class="drawer" :class="{ open: drawerOpen }" aria-label="Menu navigasi samping" :aria-hidden="!drawerOpen">
      <div class="drawer__header"><span class="drawer__logo">Menu Utama</span><button class="drawer__close" type="button" aria-label="Tutup menu" @click="drawerOpen = false"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 6-12 12M6 6l12 12"/></svg></button></div>
      <nav class="drawer__nav">
        <NuxtLink v-for="link in mainLinks" :key="link.to" :to="link.to" class="drawer__item" :class="{ active: isActive(link.to) }" @click="drawerOpen = false">{{ link.label }}</NuxtLink>
        <div class="drawer__divider" /><span class="drawer__section-label">Layanan</span>
        <NuxtLink to="/usulkan-buku" class="drawer__item" @click="drawerOpen = false">Usulkan Buku</NuxtLink>
        <NuxtLink to="/sumbangkan-buku" class="drawer__item" @click="drawerOpen = false">Sumbangkan Buku</NuxtLink>
        <NuxtLink to="/favorit" class="drawer__item" @click="drawerOpen = false">Buku Favorit</NuxtLink>
      </nav>
    </aside>
  </div>
</template>