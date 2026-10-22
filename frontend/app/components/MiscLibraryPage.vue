<script setup lang="ts">
import { hasStoredAuthSession } from '../composables/useAuth'

const props = defineProps<{ page: string }>()
const route = useRoute()
const requiresAccount = computed(() => ['favorit', 'usulkan-buku', 'sumbangkan-buku'].includes(props.page))
const canAccessProtectedPage = ref(false)
const { setNotice } = useAuth()
const { ids: favoriteIds } = useFavorites()
const { catalog: books, ready: booksReady, recordBookRead, addProposal, addDonation } = useLibraryAdmin()
const selectedBook = computed(() => books.value.find(book => book.title === String(route.query.judul || '')) || books.value[0]!)
watch(
  [() => props.page, () => selectedBook.value.id, booksReady],
  ([currentPage, bookId, isReady]) => {
    if (currentPage === 'buku-detail' && isReady) recordBookRead(bookId)
  },
  { immediate: true },
)
const favoriteBooks = computed(() => books.value.filter(book => favoriteIds.value.includes(book.id)))
const selectedSummary = ref('')
const summaryVisible = ref(false)
const summaryQuery = ref('')
const summaryCopied = ref(false)
const formSent = ref(false)
const formError = ref('')
const requestTitle = ref('')
const requestAuthor = ref('')
const requestGenre = ref('')
const requestNote = ref('')
const donorName = ref('')
const donorEmail = ref('')
const donationQuantity = ref(1)

const pageTitle = computed(() => ({
  'buku-detail': selectedBook.value.title,
  'favorit': 'Buku Favorit',
  'ai-ringkas': 'Rangkuman Buku',
  'usulkan-buku': 'Usulkan Buku',
  'sumbangkan-buku': 'Sumbangkan Buku',
  'pdf-viewer': 'Pembaca Digital',
}[props.page] || 'Perpustakaan Digital Karanganyar'))

const summaries: Record<string, string> = {
  'Laskar Pelangi': 'Di sebuah sekolah sederhana di Belitung, sepuluh anak belajar mempertahankan mimpi di tengah keterbatasan. Persahabatan, ketekunan, dan keberanian mereka menunjukkan bahwa pendidikan dapat membuka cakrawala yang jauh lebih luas.',
  'Bumi Manusia': 'Minke tumbuh sebagai pelajar pribumi yang berhadapan dengan struktur kolonial dan ketidakadilan hukum. Melalui cinta, pendidikan, dan tulisan, ia memperjuangkan martabat serta kebebasan berpikir.',
  'Saman': 'Empat sahabat perempuan menempuh jalan hidup yang berbeda sambil menghadapi perubahan sosial dan pilihan pribadi. Novel ini menyoroti suara perempuan, kebebasan, dan keberanian menentukan hidup sendiri.',
}

useHead(() => ({ title: `${pageTitle.value} · Perpustakaan Digital Karanganyar` }))

onMounted(async () => {
  if (!requiresAccount.value) return
  if (hasStoredAuthSession()) {
    canAccessProtectedPage.value = true
    return
  }
  setNotice('Silakan masuk atau buat akun terlebih dahulu untuk mengakses fitur ini.')
  await navigateTo({ path: '/masuk', query: { redirect: route.fullPath, authRequired: '1' } })
})

function showSummary() {
  const book = books.value.find(item => item.title.toLocaleLowerCase('id').includes(summaryQuery.value.trim().toLocaleLowerCase('id')))
  if (!book) return
  selectedSummary.value = summaries[book.title] || book.description
  summaryQuery.value = book.title
  summaryVisible.value = true
}

async function copySummary() {
  if (!import.meta.client || !navigator.clipboard) return
  await navigator.clipboard.writeText(selectedSummary.value)
  summaryCopied.value = true
  setTimeout(() => { summaryCopied.value = false }, 1800)
}

function submitRequest() {
  formError.value = ''
  const title = requestTitle.value.trim()
  const author = requestAuthor.value.trim()
  if (!title || !author || !requestGenre.value) {
    formError.value = 'Lengkapi judul, penulis, dan kategori buku.'
    return
  }
  const saved = props.page === 'usulkan-buku'
    ? addProposal({ title, author, genre: requestGenre.value, note: requestNote.value.trim() })
    : addDonation({
        title,
        author,
        genre: requestGenre.value,
        quantity: donationQuantity.value,
        donor: donorName.value.trim(),
        email: donorEmail.value.trim(),
        note: requestNote.value.trim(),
      })
  if (saved) formSent.value = true
  else formError.value = 'Data belum tersimpan. Periksa kapasitas penyimpanan browser dan coba lagi.'
}
</script>

<template>
  <div>
    <AppNavbar v-if="page !== 'pdf-viewer'" />
    <template v-if="!requiresAccount || canAccessProtectedPage">
    <main v-if="page === 'buku-detail'" class="container detail-page">
      <article class="book-detail">
        <div class="detail-cover">
          <div class="detail-book">
            <span class="detail-book__pages" aria-hidden="true"></span>
            <img class="detail-book__cover" :src="selectedBook.cover || `https://picsum.photos/seed/${selectedBook.seed}/640/900`" :alt="`Sampul ${selectedBook.title}`" />
          </div>
        </div>
        <div class="detail-copy"><p class="eyebrow">{{ selectedBook.genre }} · {{ selectedBook.year }}</p><h1>{{ selectedBook.title }}</h1><p class="detail-author">Oleh {{ selectedBook.author }}</p><div class="detail-stats"><span>{{ selectedBook.reads }} dibaca</span><span>Bahasa Indonesia</span><span>Koleksi digital</span></div><p class="detail-description">{{ selectedBook.description }} Kisah ini menjadi bagian dari koleksi bacaan pilihan Perpustakaan Digital Kabupaten Karanganyar.</p><div class="detail-actions"><NuxtLink v-if="selectedBook.pdf" :to="{ path: '/pdf-viewer', query: { judul: selectedBook.title } }" class="btn btn--primary btn--lg">Baca Buku</NuxtLink><NuxtLink v-else to="/admin/kelola-buku" class="btn btn--secondary btn--lg">Unggah PDF untuk Membaca</NuxtLink><NuxtLink to="/ai-ringkas" class="btn btn--secondary">Lihat Rangkuman</NuxtLink></div><p v-if="!selectedBook.pdf" class="form-hint">File PDF untuk buku ini belum tersedia di katalog.</p><div class="detail-meta"><div><span>Penulis</span><strong>{{ selectedBook.author }}</strong></div><div><span>Tahun terbit</span><strong>{{ selectedBook.year }}</strong></div><div><span>Kategori</span><strong>{{ selectedBook.genre }}</strong></div></div></div>
      </article>
      <section class="detail-related"><div class="section-header"><h2 class="section-title">Bacaan serupa</h2><NuxtLink to="/semua-buku" class="section-link">Lihat semua ›</NuxtLink></div><div class="book-row"><BookCard v-for="book in books.filter(item => item.id !== selectedBook.id).slice(0, 5)" :key="book.id" :book="book" /></div></section>
    </main>

    <main v-else-if="page === 'favorit'" class="container section service-page">
      <p class="eyebrow">Koleksi pribadi</p><h1 class="page-heading">Buku Favorit</h1><p class="page-intro">Bacaan yang Anda simpan akan berkumpul di sini.</p>
      <div v-if="favoriteBooks.length" class="books-grid"><BookCard v-for="book in favoriteBooks" :key="book.id" :book="book" show-reads /></div>
      <div v-else class="empty-state"><svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1 7.8 7.7 7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8Z"/></svg><h3>Belum ada buku tersimpan</h3><p>Pilih ikon hati pada buku yang ingin Anda baca nanti.</p><NuxtLink to="/semua-buku" class="btn btn--primary">Jelajahi katalog</NuxtLink></div>
    </main>

    <main v-else-if="page === 'ai-ringkas'" class="container service-page ai-page">
      <header class="ai-header"><p class="eyebrow">Baca lebih efisien</p><h1 class="ai-header__title">Rangkuman Buku</h1><p class="ai-header__sub">Pilih judul dari katalog untuk membaca intisari dan gagasan utama.</p></header>
      <form class="ai-form" @submit.prevent="showSummary"><div class="form-group"><label class="form-label" for="summary-book">Pilih buku</label><select id="summary-book" v-model="summaryQuery" class="form-select"><option value="">Pilih judul buku</option><option v-for="book in books" :key="book.id" :value="book.title">{{ book.title }} — {{ book.author }}</option></select></div><button class="btn btn--primary btn--lg" type="submit">Lihat Rangkuman</button></form>
      <article v-if="summaryVisible" class="summary-result"><div class="summary-result__top"><span class="badge badge--genre">INTISARI BUKU</span><button class="btn btn--ghost" type="button" @click="copySummary">{{ summaryCopied ? 'Tersalin' : 'Salin teks' }}</button></div><h2>{{ summaryQuery }}</h2><p>{{ selectedSummary }}</p><small>Rangkuman ini merupakan ikhtisar gagasan utama. Baca naskah lengkap untuk pengalaman membaca yang utuh.</small></article>
    </main>

    <main v-else-if="page === 'usulkan-buku' || page === 'sumbangkan-buku'" class="container service-page request-page">
      <div class="request-intro"><p class="eyebrow">Berkontribusi untuk literasi</p><h1 class="page-heading">{{ page === 'usulkan-buku' ? 'Usulkan Buku' : 'Sumbangkan Buku' }}</h1><p class="page-intro">{{ page === 'usulkan-buku' ? 'Bantu kami melengkapi koleksi dengan buku yang ingin Anda baca.' : 'Bagikan buku bermakna agar dapat diakses lebih banyak pembaca.' }}</p></div>
      <section class="request-panel">
        <div v-if="formSent" class="request-success"><span class="success-icon">✓</span><h2>Terima kasih atas kontribusi Anda</h2><p>Data sudah tercatat untuk ditinjau oleh tim perpustakaan.</p><button class="btn btn--secondary" type="button" @click="formSent = false">Kirim usulan lain</button></div>
        <form v-else class="request-form" @submit.prevent="submitRequest">
          <div class="form-group"><label class="form-label" for="book-title">Judul buku</label><input id="book-title" v-model="requestTitle" class="form-input" required placeholder="Masukkan judul buku" /></div>
          <div class="form-row"><div class="form-group"><label class="form-label" for="book-author">Nama penulis</label><input id="book-author" v-model="requestAuthor" class="form-input" required placeholder="Nama penulis" /></div><div class="form-group"><label class="form-label" for="book-genre">Kategori</label><select id="book-genre" v-model="requestGenre" class="form-select" required><option value="">Pilih kategori</option><option v-for="genre in ['Fiksi', 'Sastra', 'Sejarah', 'Biografi', 'Ilmu Pengetahuan', 'Anak-anak', 'Lokal & Budaya Jawa', 'Agama']" :key="genre">{{ genre }}</option></select></div></div>
          <div class="form-group"><label class="form-label" for="request-note">{{ page === 'usulkan-buku' ? 'Alasan usulan' : 'Catatan kondisi buku' }}</label><textarea id="request-note" v-model="requestNote" class="form-textarea" rows="4" :placeholder="page === 'usulkan-buku' ? 'Ceritakan mengapa buku ini perlu ditambahkan' : 'Jelaskan kondisi dan informasi tambahan buku'" /></div>
          <div v-if="page === 'sumbangkan-buku'" class="form-row"><div class="form-group"><label class="form-label" for="donor-name">Nama penyumbang</label><input id="donor-name" v-model="donorName" class="form-input" required placeholder="Nama Anda" /></div><div class="form-group"><label class="form-label" for="donor-email">Email</label><input id="donor-email" v-model="donorEmail" class="form-input" required type="email" placeholder="nama@email.com" /></div></div>
          <div v-if="page === 'sumbangkan-buku'" class="form-group"><label class="form-label" for="donation-quantity">Jumlah buku</label><input id="donation-quantity" v-model.number="donationQuantity" class="form-input" required type="number" min="1" max="10000" /></div>
          <p v-if="formError" class="form-error auth-error" role="alert">{{ formError }}</p>
          <button class="btn btn--primary" type="submit">{{ page === 'usulkan-buku' ? 'Kirim Usulan' : 'Kirim Informasi Sumbangan' }}</button>
        </form>
      </section>
    </main>

    <PdfBookReader
      v-else
      :source="selectedBook.pdf || ''"
      :title="selectedBook.title"
      :author="selectedBook.author"
      :category="selectedBook.genre"
      :cover="selectedBook.cover"
    />
    </template>
    <AppFooter v-if="page !== 'pdf-viewer'" />
  </div>
</template>

<style scoped>
.service-page { min-height: 60vh; padding-block: clamp(2rem, 5vw, 3.5rem) 4rem; }
.page-heading { margin: 0.2rem 0 0.4rem; font-size: 1.8rem; }
.page-intro { max-width: 620px; color: var(--color-text-muted); font-size: 0.9rem; }
.books-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1rem; margin-top: 2rem; }
.detail-page { padding-block: 2rem 4rem; }
.book-detail { display: grid; grid-template-columns: minmax(300px, 420px) minmax(0, 1fr); gap: clamp(2rem, 6vw, 5rem); align-items: start; padding: clamp(1.25rem, 3vw, 2.5rem); border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: color-mix(in srgb, var(--color-bg) 96%, var(--color-text) 4%); }
.detail-cover { position: relative; display: grid; min-height: 460px; place-items: center; overflow: visible; isolation: isolate; perspective: 1200px; }
.detail-cover::before { position: absolute; z-index: -1; width: min(78%, 310px); aspect-ratio: 1; border-radius: 50%; background: radial-gradient(ellipse, color-mix(in srgb, var(--color-accent) 13%, transparent), transparent 68%); content: ""; filter: blur(18px); }
.detail-book { position: relative; width: min(72%, 280px); aspect-ratio: 2 / 3; transform: rotateY(-7deg) rotateZ(-0.5deg); transform-style: preserve-3d; filter: drop-shadow(12px 18px 13px rgba(0, 0, 0, 0.3)); transition: transform 380ms cubic-bezier(0.2, 0.75, 0.25, 1), filter 380ms ease; }
.detail-book::before { position: absolute; z-index: 0; top: 1%; bottom: 0; left: -7%; width: 8%; border: 1px solid rgba(255, 255, 255, 0.1); border-right: 0; border-radius: 3px 0 0 4px; background: linear-gradient(90deg, #101010 0%, #303030 24%, #151515 100%); content: ""; transform: skewY(-1deg); transform-origin: right; }
.detail-book::after { position: absolute; z-index: 2; inset: 0; border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 2px 4px 4px 2px; background: linear-gradient(110deg, rgba(255, 255, 255, 0.12), transparent 24% 80%, rgba(0, 0, 0, 0.12)); content: ""; pointer-events: none; }
.detail-book__pages { position: absolute; z-index: 2; top: -3%; right: 1%; left: -7%; height: 4.5%; border: 1px solid #c8c6c1; border-bottom: 0; border-radius: 3px 4px 0 0; background: repeating-linear-gradient(to bottom, #fff 0 1px, #d6d4cf 1px 2px); clip-path: polygon(0 45%, 98% 0, 100% 70%, 5% 100%); }
.detail-book__cover { position: relative; z-index: 1; display: block; width: 100%; height: 100%; border: 1px solid rgba(0, 0, 0, 0.35); border-radius: 2px 4px 4px 2px; object-fit: cover; box-shadow: inset 3px 0 8px rgba(0, 0, 0, 0.2); backface-visibility: hidden; }
.detail-cover:hover .detail-book { transform: translateY(-12px) scale(1.045) rotateY(-7deg) rotateZ(-0.5deg); filter: drop-shadow(17px 27px 17px rgba(0, 0, 0, 0.35)); }
.detail-copy h1 { margin: 0.4rem 0; font-size: clamp(2rem, 4vw, 3rem); }
.detail-author { color: var(--color-text-muted); }
.detail-stats { display: flex; flex-wrap: wrap; gap: 0.75rem; margin: 1.2rem 0; color: var(--color-text-muted); font-size: 0.78rem; }
.detail-stats span { padding: 0.3rem 0.6rem; border: 1px solid var(--color-border); border-radius: var(--radius-pill); }
.detail-description { max-width: 600px; line-height: 1.8; }
.detail-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; margin: 1.5rem 0; }
.detail-meta { display: flex; flex-wrap: wrap; gap: 2.2rem; padding-top: 1rem; border-top: 1px solid var(--color-border); }
.detail-meta div { display: grid; gap: 0.2rem; font-size: 0.8rem; }
.detail-meta span { color: var(--color-text-muted); }
.detail-related { padding-top: 1rem; }
.ai-page { max-width: 760px; margin-inline: auto; }
.ai-header { margin-bottom: 2.2rem; text-align: center; }
.ai-header__title { margin: 0.35rem 0; font-size: 2rem; }
.ai-header__sub { color: var(--color-text-muted); font-size: 0.9rem; }
.ai-form { display: grid; gap: 1rem; }
.ai-form > button { justify-self: start; }
.summary-result { margin-top: 1.5rem; padding: 1.5rem; border: 1.5px solid var(--color-border); border-radius: var(--radius-md); }
.summary-result__top { display: flex; justify-content: space-between; align-items: center; }
.summary-result h2 { margin: 1rem 0 0.5rem; font-size: 1.2rem; }
.summary-result p { line-height: 1.8; }
.summary-result small { display: block; margin-top: 1rem; color: var(--color-text-muted); }
.request-page { display: grid; grid-template-columns: minmax(220px, 0.7fr) minmax(0, 1fr); gap: clamp(2rem, 8vw, 7rem); align-items: start; }
.request-panel { padding: 1.5rem; border: 1.5px solid var(--color-border); border-radius: var(--radius-md); }
.request-form { display: grid; gap: 1.1rem; }
.request-form .form-group { gap: 0.4rem; }
.form-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
.request-success { display: grid; justify-items: start; gap: 0.8rem; }
.request-success p { color: var(--color-text-muted); }
@media (max-width: 760px) { .book-detail { grid-template-columns: minmax(180px, 34%) 1fr; gap: 1.25rem; padding: 1.25rem; } .detail-cover { min-height: 320px; } .detail-copy h1 { font-size: 1.65rem; } .books-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .request-page { grid-template-columns: 1fr; gap: 1.5rem; } }
@media (max-width: 520px) {
  .detail-page { padding-top: 1.25rem; }
  .book-detail { grid-template-columns: 1fr; gap: 0.75rem; padding: 1rem; }
  .detail-cover { width: 100%; min-height: 330px; margin-inline: auto; }
  .detail-book { width: min(72%, 250px); }
  .detail-copy h1 { font-size: 1.7rem; }
  .detail-actions { align-items: stretch; flex-direction: column; }
  .detail-actions .btn { width: 100%; }
  .detail-meta { gap: 1rem 1.5rem; }
  .form-row { grid-template-columns: 1fr; gap: 0.85rem; }
  .request-panel { padding: 1rem; }
  .summary-result { padding: 1rem; }
}
@media (prefers-reduced-motion: reduce) {
  .detail-book { transition: none; }
  .detail-cover:hover .detail-book { transform: rotateY(-7deg) rotateZ(-0.5deg); }
}
</style>