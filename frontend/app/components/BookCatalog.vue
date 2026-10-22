<script setup lang="ts">
const route = useRoute()
const { catalog, catalogError, ready } = useLibraryAdmin()
const search = ref(String(route.query.q || ''))
const selectedGenres = ref<string[]>([])
const yearRange = ref('')
const sortBy = ref('reads')
const page = ref(1)
const expanded = reactive({ genre: true, year: true, classification: false })
const perPage = 8

const category = computed(() => String(route.query.nama || '').trim())
const yearRanges = [
  { label: '2020 – 2026', from: 2020, to: 2026 },
  { label: '2010 – 2019', from: 2010, to: 2019 },
  { label: '2000 – 2009', from: 2000, to: 2009 },
  { label: '1990 – 1999', from: 1990, to: 1999 },
  { label: 'Sebelum 1990', from: 0, to: 1989 },
]

const filteredBooks = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('id')
  const range = yearRanges.find(item => item.label === yearRange.value)
  const results = catalog.value.filter((book) => {
    const matchesQuery = !query || `${book.title} ${book.author} ${book.genre}`.toLocaleLowerCase('id').includes(query)
    const matchesGenre = selectedGenres.value.length === 0 || selectedGenres.value.includes(book.genre)
    const matchesYear = !range || (book.year >= range.from && book.year <= range.to)
    const matchesCategory = !category.value
      || (category.value === 'Nonfiksi'
        ? book.genre !== 'Fiksi'
        : book.genre === category.value || (category.value === 'Biografi' && book.genre === 'Sejarah'))
    return matchesQuery && matchesGenre && matchesYear && matchesCategory
  })

  return results.sort((left, right) => {
    if (sortBy.value === 'newest') return right.year - left.year
    if (sortBy.value === 'title') return left.title.localeCompare(right.title, 'id')
    if (sortBy.value === 'oldest') return left.year - right.year
    return Number.parseFloat(right.reads.replace(',', '.')) - Number.parseFloat(left.reads.replace(',', '.'))
  })
})

const pageCount = computed(() => Math.max(1, Math.ceil(filteredBooks.value.length / perPage)))
const visibleBooks = computed(() => filteredBooks.value.slice((page.value - 1) * perPage, page.value * perPage))
const pageButtons = computed(() => Array.from({ length: pageCount.value }, (_, index) => index + 1))

watch([search, selectedGenres, yearRange, sortBy, category], () => { page.value = 1 }, { deep: true })
watch(() => route.query.q, value => { search.value = String(value || '') })
useHead(() => ({ title: `${category.value ? `Kategori: ${category.value}` : 'Semua Buku'} · Perpustakaan Digital Karanganyar` }))

function resetFilters() {
  search.value = ''
  selectedGenres.value = []
  yearRange.value = ''
  sortBy.value = 'reads'
}
</script>

<template>
  <div>
    <AppNavbar />
    <main class="container books-page">
      <header class="catalog-heading">
        <p class="eyebrow">Katalog digital Karanganyar</p>
        <h1>{{ category ? `Kategori: ${category}` : 'Semua Buku' }}</h1>
        <p>Jelajahi koleksi perpustakaan, temukan bacaan berikutnya.</p>
      </header>

      <div class="books-layout">
        <aside class="filter-sidebar" aria-label="Filter buku">
          <div class="filter-sidebar__header"><span class="filter-sidebar__title">Filter</span><button class="filter-sidebar__reset" type="button" @click="resetFilters">Reset</button></div>
          <section class="filter-group">
            <button class="filter-group__toggle" type="button" :aria-expanded="expanded.genre" @click="expanded.genre = !expanded.genre">Genre <span class="filter-chevron" :class="{ closed: !expanded.genre }">⌄</span></button>
            <div v-if="expanded.genre" class="filter-group__body">
              <label v-for="genre in ['Fiksi', 'Sastra', 'Sejarah', 'Biografi', 'Ilmu Pengetahuan', 'Anak-anak', 'Lokal & Budaya Jawa']" :key="genre" class="filter-checkbox"><input v-model="selectedGenres" type="checkbox" :value="genre" />{{ genre }}</label>
            </div>
          </section>
          <section class="filter-group">
            <button class="filter-group__toggle" type="button" :aria-expanded="expanded.year" @click="expanded.year = !expanded.year">Tahun Terbit <span class="filter-chevron" :class="{ closed: !expanded.year }">⌄</span></button>
            <div v-if="expanded.year" class="filter-group__body">
              <select v-model="yearRange" class="filter-select" aria-label="Pilih tahun"><option value="">Semua tahun</option><option v-for="range in yearRanges" :key="range.label" :value="range.label">{{ range.label }}</option></select>
            </div>
          </section>
          <section class="filter-group">
            <button class="filter-group__toggle" type="button" :aria-expanded="expanded.classification" @click="expanded.classification = !expanded.classification">Klasifikasi <span class="filter-chevron" :class="{ closed: !expanded.classification }">⌄</span></button>
            <div v-if="expanded.classification" class="filter-group__body">
              <label class="filter-checkbox"><input v-model="selectedGenres" type="checkbox" value="Ilmu Pengetahuan" />Umum (000)</label>
              <label class="filter-checkbox"><input v-model="selectedGenres" type="checkbox" value="Lokal & Budaya Jawa" />Bahasa (400)</label>
              <label class="filter-checkbox"><input v-model="selectedGenres" type="checkbox" value="Sastra" />Sastra (800)</label>
              <label class="filter-checkbox"><input v-model="selectedGenres" type="checkbox" value="Sejarah" />Sejarah (900)</label>
            </div>
          </section>
        </aside>

        <section class="books-main" aria-label="Daftar koleksi buku">
          <div class="books-toolbar">
            <label class="catalog-search"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg><input v-model="search" type="search" placeholder="Cari judul atau penulis" aria-label="Cari judul atau penulis" /></label>
            <label class="books-sort"><span>Urut:</span><select v-model="sortBy" class="filter-select" aria-label="Urutkan buku"><option value="reads">Paling Banyak Dibaca</option><option value="oldest">Terlama ke Terbaru</option><option value="newest">Terbaru ke Terlama</option><option value="title">Judul A–Z</option></select></label>
          </div>
          <p class="books-count">Menampilkan <strong>{{ visibleBooks.length }}</strong> dari <strong>{{ filteredBooks.length }}</strong> buku</p>
          <p v-if="catalogError" class="form-error" role="alert">Katalog belum dapat dimuat dari server: {{ catalogError }}</p>
          <div v-if="visibleBooks.length" class="books-grid"><BookCard v-for="book in visibleBooks" :key="book.id" :book="book" show-reads /></div>
          <div v-else class="empty-state"><svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg><h3>{{ ready && !catalogError && !catalog.length ? 'Belum ada buku aktif di katalog' : 'Buku tidak ditemukan' }}</h3><p>{{ ready && !catalogError && !catalog.length ? 'Periksa status buku di basis data atau tambahkan koleksi melalui panel admin.' : 'Coba ubah kata kunci atau filter pencarian.' }}</p></div>
          <nav v-if="pageCount > 1" class="books-pagination" aria-label="Halaman katalog"><button class="pagination-btn" type="button" aria-label="Halaman sebelumnya" :disabled="page === 1" @click="page--">‹</button><button v-for="number in pageButtons" :key="number" class="pagination-btn" :class="{ active: page === number }" type="button" :aria-current="page === number ? 'page' : undefined" @click="page = number">{{ number }}</button><button class="pagination-btn" type="button" aria-label="Halaman berikutnya" :disabled="page === pageCount" @click="page++">›</button></nav>
        </section>
      </div>
    </main>
    <AppFooter />
  </div>
</template>

<style scoped>
.books-page { padding-block: 2.5rem 4rem; }
.catalog-heading { margin-bottom: 1.8rem; }
.catalog-heading h1 { font-size: 1.65rem; margin: 0.2rem 0 0.35rem; }
.catalog-heading > p:last-child { color: var(--color-text-muted); font-size: 0.9rem; }
.eyebrow { color: var(--color-accent); font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.books-layout { display: grid; grid-template-columns: 240px minmax(0, 1fr); gap: 2rem; align-items: start; }
.filter-sidebar { position: sticky; top: calc(var(--nav-height) + 1.5rem); border: 1.5px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; }
.filter-sidebar__header { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; border-bottom: 1.5px solid var(--color-border); }
.filter-sidebar__title { font-size: 0.875rem; font-weight: 600; }
.filter-sidebar__reset { min-height: 36px; padding: 0.35rem 0.55rem; border-radius: var(--radius-sm); color: var(--color-accent); font: inherit; font-size: 0.775rem; }
.filter-sidebar__reset:hover { background: var(--color-search-focus-ring); }
.filter-group { border-bottom: 1.5px solid var(--color-border); }
.filter-group:last-child { border-bottom: 0; }
.filter-group__toggle { display: flex; width: 100%; justify-content: space-between; padding: 0.85rem 1.25rem; color: var(--color-text); font-size: 0.85rem; font-weight: 600; text-align: left; }
.filter-chevron { transition: transform var(--transition-fast); }
.filter-chevron.closed { transform: rotate(-90deg); }
.filter-group__body { display: flex; flex-direction: column; gap: 0.6rem; padding: 0 1.25rem 1rem; }
.filter-checkbox { display: flex; align-items: center; gap: 0.5rem; color: var(--color-text); cursor: pointer; font-size: 0.82rem; }
.filter-checkbox input { width: 15px; height: 15px; accent-color: var(--color-accent); }
.filter-select { max-width: 100%; min-height: 40px; padding: 0.45rem 0.65rem; border: 1.5px solid var(--color-border); border-radius: var(--radius-sm); color: var(--color-text); background: var(--color-bg); font: inherit; font-size: 0.82rem; }
.books-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 0.75rem; }
.catalog-search { display: flex; align-items: center; gap: 0.55rem; min-width: min(200px, 100%); min-height: 44px; padding: 0.45rem 0.7rem; border: 1.5px solid var(--color-border); border-radius: var(--radius-sm); color: var(--color-text-muted); }
.catalog-search:focus-within { border-color: var(--color-accent); box-shadow: 0 0 0 3px var(--color-search-focus-ring); }
.catalog-search input { min-width: 0; border: 0; outline: 0; color: var(--color-text); background: transparent; font: inherit; font-size: 0.82rem; }
.books-sort { display: flex; align-items: center; gap: 0.5rem; color: var(--color-text-muted); font-size: 0.82rem; }
.books-count { margin-bottom: 1rem; color: var(--color-text-muted); font-size: 0.82rem; }
.books-count strong { color: var(--color-text); }
.books-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1.1rem; }
.books-pagination { display: flex; justify-content: center; gap: 0.35rem; margin-top: 2rem; }
@media (max-width: 960px) { .books-layout { grid-template-columns: 1fr; gap: 1.25rem; } .filter-sidebar { position: static; } .books-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 620px) { .books-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; } .books-toolbar { align-items: stretch; flex-direction: column; } .catalog-search { width: 100%; } .books-sort { justify-content: space-between; } .books-sort select { flex: 1; } .filter-sidebar__header, .filter-group__toggle { padding-inline: 0.9rem; } .filter-group__body { padding-inline: 0.9rem; } }
</style>