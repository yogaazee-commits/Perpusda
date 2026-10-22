<script setup lang="ts">
import { categories } from '../data/books'

const { catalog: books, catalogError, ready } = useLibraryAdmin()
const slides = computed(() => [...books.value]
  .sort((first, second) => getBookReadCount(second) - getBookReadCount(first))
  .slice(0, 5))
const currentSlide = ref(0)
let slideTimer: ReturnType<typeof setInterval> | undefined

function getBookReadCount(book: (typeof books.value)[number]) {
  const readCount = book.readCount
  if (typeof readCount === 'number' && Number.isSafeInteger(readCount) && readCount >= 0) {
    return readCount
  }

  const normalizedReads = book.reads.trim().toLocaleLowerCase('id').replace(',', '.')
  const reads = Number.parseFloat(normalizedReads)
  if (!Number.isFinite(reads) || reads < 0) return 0

  return reads * (/(?:rb|ribu|k)$/.test(normalizedReads) ? 1000 : 1)
}

onMounted(() => {
  slideTimer = setInterval(() => { currentSlide.value = (currentSlide.value + 1) % Math.max(1, slides.value.length) }, 7000)
})
onBeforeUnmount(() => clearInterval(slideTimer))
watch(slides, value => {
  currentSlide.value = value.length ? currentSlide.value % value.length : 0
}, { immediate: true })
useHead({ title: 'Perpustakaan Digital Kabupaten Karanganyar' })

function moveSlide(direction: number) {
  currentSlide.value = (currentSlide.value + direction + Math.max(1, slides.value.length)) % Math.max(1, slides.value.length)
}
</script>

<template>
  <div id="home">
    <AppNavbar />
    <section class="hero" aria-label="Buku populer unggulan" aria-live="polite">
      <div class="hero__header"><h2 class="section-title hero__section-title">Populer Saat Ini</h2></div>
      <div v-for="(book, index) in slides" :key="book.id" class="hero__slide" :class="{ active: currentSlide === index }" role="group" aria-roledescription="slide" :aria-label="`${book.title}, ${book.reads} kali dibaca`">
        <img class="hero__bg" :src="book.cover || `https://picsum.photos/seed/${book.seed}/1600/900`" alt="" aria-hidden="true" />
        <div class="hero__overlay" />
        <div class="hero__content">
          <h1 class="hero__title"><NuxtLink :to="{ path: '/buku-detail', query: { judul: book.title } }" class="hero__title-link">{{ book.title }}</NuxtLink></h1>
          <p class="hero__synopsis">{{ book.description }}</p>
          <div class="hero__actions"><NuxtLink :to="{ path: '/buku-detail', query: { judul: book.title } }" class="btn btn--primary">Baca Sekarang</NuxtLink></div>
        </div>
        <div class="hero__slide-footer"><span class="hero__slide-author">{{ book.author }} · {{ book.year }}</span><span class="hero__slide-reads">{{ book.reads }} kali dibaca</span></div>
      </div>
      <div v-if="slides.length > 1" class="hero__nav">
        <span class="hero__nav-num" aria-live="assertive">No. {{ currentSlide + 1 }} / {{ slides.length }}</span>
        <button class="hero__nav-btn" type="button" aria-label="Slide sebelumnya" @click="moveSlide(-1)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="m15 18-6-6 6-6"/></svg></button>
        <button class="hero__nav-btn" type="button" aria-label="Slide berikutnya" @click="moveSlide(1)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="m9 18 6-6-6-6"/></svg></button>
      </div>
    </section>

    <main class="container">
      <p v-if="catalogError" class="form-error" role="alert">Katalog belum dapat dimuat dari server: {{ catalogError }}</p>
      <p v-else-if="ready && !books.length" class="form-hint" role="status">Backend terhubung, tetapi belum ada buku aktif di katalog.</p>
      <section class="home-section" aria-labelledby="favorite-heading">
        <div class="section-header"><h2 id="favorite-heading" class="section-title">Pilihan Favorit Warga</h2><NuxtLink to="/favorit" class="section-link">Lihat Semua <span aria-hidden="true">›</span></NuxtLink></div>
        <div class="book-row"><BookCard v-for="book in books.slice(0, 5)" :key="book.id" :book="book" show-reads /></div>
      </section>
      <section class="home-section" aria-labelledby="new-heading">
        <div class="section-header"><h2 id="new-heading" class="section-title">Koleksi Terbaru</h2><NuxtLink to="/semua-buku" class="section-link">Lihat Semua <span aria-hidden="true">›</span></NuxtLink></div>
        <div class="book-row"><BookCard v-for="book in books.slice(-5)" :key="book.id" :book="book" /></div>
      </section>
      <section class="home-section" aria-labelledby="category-heading">
        <div class="section-header"><h2 id="category-heading" class="section-title">Jelajahi Kategori</h2></div>
        <div class="category-grid">
          <NuxtLink v-for="category in categories" :key="category.name" :to="{ path: '/kategori', query: { nama: category.name } }" class="category-card">
            <span class="category-card__symbol" aria-hidden="true">{{ category.symbol }}</span><span class="category-card__name">{{ category.name }}</span>
          </NuxtLink>
        </div>
      </section>
      <section class="home-section"><div class="summary-card"><div class="summary-card__content"><h2 class="summary-card__title">Rangkuman Buku Cerdas</h2><p class="summary-card__desc">Tidak punya waktu membaca naskah penuh? Baca intisari dan wawasan utama dari buku pilihan yang dirangkum khusus untuk Anda.</p></div><NuxtLink to="/ai-ringkas" class="btn btn--primary btn--lg summary-card__btn">Mulai Membaca Rangkuman</NuxtLink></div></section>
    </main>
    <AppFooter />
  </div>
</template>