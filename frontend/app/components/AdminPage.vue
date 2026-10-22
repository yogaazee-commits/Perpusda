<script setup lang="ts">
import type { Book } from '../data/books'
import type { BookDonation, BookProposal, LibraryUser, ReviewStatus } from '../composables/useLibraryAdmin'

const props = defineProps<{ page: string }>()
const current = computed(() => props.page.split('/').pop() || 'dashboard')
const pageTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  'kelola-buku': 'Kelola Buku',
  'kelola-pengguna': 'Kelola Pengguna',
  usulan: 'Usulan Buku',
  sumbangan: 'Sumbangan Buku',
}
const title = computed(() => pageTitles[current.value] || 'Dashboard')
const search = ref('')
const userName = ref('')
const userEmail = ref('')
const message = ref('')
const uploadError = ref('')
const pdfFile = shallowRef<File | null>(null)
const pdfChanged = ref(false)
const showBookForm = ref(false)
const { catalog, proposals, donations, users, storageError, catalogError, ready, saveBook, removeBook, updateProposal, removeProposal, updateDonation, removeDonation, saveUser, removeUser, exportData, importData } = useLibraryAdmin()

const bookForm = reactive({
  id: undefined as number | string | undefined,
  title: '',
  author: '',
  genre: 'Fiksi',
  year: new Date().getFullYear(),
  reads: '0',
  seed: '',
  description: '',
  cover: '',
  pdf: '',
  pdfName: '',
})

const sidebarLinks = [
  { label: 'Dashboard', to: '/admin/dashboard', key: 'dashboard' },
  { label: 'Kelola Buku', to: '/admin/kelola-buku', key: 'kelola-buku' },
  { label: 'Kelola Pengguna', to: '/admin/kelola-pengguna', key: 'kelola-pengguna' },
  { label: 'Usulan Buku', to: '/admin/usulan', key: 'usulan' },
  { label: 'Sumbangan Buku', to: '/admin/sumbangan', key: 'sumbangan' },
]

const filteredBooks = computed(() => catalog.value.filter(book => `${book.title} ${book.author} ${book.genre}`.toLocaleLowerCase('id').includes(search.value.trim().toLocaleLowerCase('id'))))
const filteredUsers = computed(() => users.value.filter(user => `${user.name} ${user.email} ${user.role}`.toLocaleLowerCase('id').includes(search.value.trim().toLocaleLowerCase('id'))))
const filteredProposals = computed(() => proposals.value.filter(item => `${item.title} ${item.author} ${item.genre} ${item.status}`.toLocaleLowerCase('id').includes(search.value.trim().toLocaleLowerCase('id'))))
const filteredDonations = computed(() => donations.value.filter(item => `${item.title} ${item.donor} ${item.email} ${item.status}`.toLocaleLowerCase('id').includes(search.value.trim().toLocaleLowerCase('id'))))
const pendingCount = computed(() => proposals.value.filter(item => item.status === 'Menunggu').length + donations.value.filter(item => item.status === 'Menunggu').length)
const stats = computed(() => [
  { label: 'Total Buku', value: catalog.value.length, note: 'Koleksi katalog', icon: '▤' },
  { label: 'Total Pengguna', value: users.value.length, note: 'Data anggota lokal', icon: '♙' },
  { label: 'Usulan Menunggu', value: proposals.value.filter(item => item.status === 'Menunggu').length, note: `${proposals.value.length} total usulan`, icon: '↗' },
  { label: 'Sumbangan Menunggu', value: donations.value.filter(item => item.status === 'Menunggu').length, note: `${donations.value.length} total sumbangan`, icon: '⇩' },
])

useHead(() => ({ title: `${title.value} · Panel Admin` }))

onMounted(() => {
  const saved = localStorage.getItem('pdk-theme')
  const theme = saved === 'dark' || saved === 'light'
    ? saved
    : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  document.documentElement.dataset.theme = theme
})

function notify(text: string) {
  message.value = text
  setTimeout(() => {
    if (message.value === text) message.value = ''
  }, 3500)
}

function startNewBook() {
  Object.assign(bookForm, {
    id: undefined,
    title: '',
    author: '',
    genre: 'Fiksi',
    year: new Date().getFullYear(),
    reads: '0',
    seed: '',
    description: '',
    cover: '',
    pdf: '',
    pdfName: '',
  })
  pdfFile.value = null
  pdfChanged.value = false
  uploadError.value = ''
  showBookForm.value = true
}

function editBook(book: Book) {
  Object.assign(bookForm, {
    ...book,
    cover: book.cover || '',
    pdf: book.pdf || '',
    pdfName: book.pdfName || '',
  })
  pdfFile.value = null
  pdfChanged.value = false
  uploadError.value = ''
  showBookForm.value = true
}

async function readFile(event: Event, kind: 'cover' | 'pdf') {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  const correctType = kind === 'cover' ? file.type.startsWith('image/') : file.type === 'application/pdf'
  if (!correctType) {
    uploadError.value = kind === 'cover' ? 'Sampul harus berupa berkas gambar.' : 'Dokumen buku harus berupa berkas PDF.'
    return
  }
  const maxSize = kind === 'cover' ? 2 * 1024 * 1024 : 10 * 1024 * 1024
  const maxLabel = kind === 'cover' ? '2 MB' : '10 MB'

  if (file.size > maxSize) {
    uploadError.value = `Ukuran ${kind === 'cover' ? 'sampul' : 'berkas PDF'} maksimal ${maxLabel}.`
    return
  }

  try {
    if (kind === 'pdf') {
      pdfFile.value = file
      pdfChanged.value = true
      bookForm.pdfName = file.name
      uploadError.value = ''
      return
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Hasil berkas tidak valid.'))
      reader.onerror = () => reject(reader.error || new Error('Gagal membaca berkas.'))
      reader.readAsDataURL(file)
    })
    bookForm.cover = dataUrl
    uploadError.value = ''
  } catch (error) {
    console.error('Gagal memproses berkas unggahan.', error)
    uploadError.value = 'Berkas gagal dibaca. Silakan pilih berkas lain.'
  }
}

async function submitBook() {
  const titleValue = bookForm.title.trim()
  const authorValue = bookForm.author.trim()
  const descriptionValue = bookForm.description.trim()
  if (!titleValue || !authorValue || !descriptionValue || !Number.isFinite(bookForm.year)) {
    uploadError.value = 'Lengkapi judul, penulis, tahun, dan deskripsi buku.'
    return
  }
  const seed = bookForm.seed || titleValue.toLocaleLowerCase('id').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  if (await saveBook({
    ...bookForm,
    title: titleValue,
    author: authorValue,
    description: descriptionValue,
    seed,
    pdfFile: pdfFile.value || undefined,
    removePdf: pdfChanged.value && !pdfFile.value,
  })) {
    showBookForm.value = false
    notify(bookForm.id ? 'Perubahan buku berhasil disimpan.' : 'Buku berhasil ditambahkan.')
  } else {
    uploadError.value = storageError.value || 'Buku gagal disimpan. Coba gunakan file yang lebih kecil.'
  }
}

async function deleteBook(book: Book) {
  if (window.confirm(`Hapus buku "${book.title}" dari katalog?`)) {
    if (await removeBook(book.id)) notify('Buku berhasil dihapus.')
  }
}

function addUser() {
  const name = userName.value.trim()
  const email = userEmail.value.trim().toLocaleLowerCase('id')
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    notify('Masukkan nama dan alamat email yang valid.')
    return
  }
  if (users.value.some(user => user.email.toLocaleLowerCase('id') === email)) {
    notify('Alamat email tersebut sudah terdaftar.')
    return
  }
  if (saveUser({ name, email, role: 'Anggota', status: 'Aktif' })) {
    userName.value = ''
    userEmail.value = ''
    notify('Anggota berhasil ditambahkan.')
  }
}

function toggleUser(user: LibraryUser) {
  const updated = { ...user, status: user.status === 'Aktif' ? 'Nonaktif' as const : 'Aktif' as const }
  if (saveUser(updated)) notify(`Status ${user.name} berhasil diperbarui.`)
}

function deleteUser(user: LibraryUser) {
  if (window.confirm(`Hapus anggota "${user.name}"?`)) {
    if (removeUser(user.id)) notify('Anggota berhasil dihapus.')
  }
}

function reviewProposal(proposal: BookProposal, status: ReviewStatus) {
  if (updateProposal(proposal.id, status)) notify(`Usulan "${proposal.title}" diperbarui menjadi ${status.toLocaleLowerCase('id')}.`)
}

function reviewDonation(donation: BookDonation, status: ReviewStatus) {
  if (updateDonation(donation.id, status)) notify(`Sumbangan "${donation.title}" diperbarui menjadi ${status.toLocaleLowerCase('id')}.`)
}

function deleteProposal(proposal: BookProposal) {
  if (window.confirm(`Hapus usulan "${proposal.title}"?`)) {
    if (removeProposal(proposal.id)) notify('Usulan berhasil dihapus.')
  }
}

function deleteDonation(donation: BookDonation) {
  if (window.confirm(`Hapus catatan sumbangan "${donation.title}"?`)) {
    if (removeDonation(donation.id)) notify('Catatan sumbangan berhasil dihapus.')
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value))
}

async function exportLocalData() {
  try {
    await exportData()
    notify('Ekspor JSON berhasil dimulai.')
  } catch (error) {
    console.error('Gagal mengekspor data admin.', error)
    notify(error instanceof Error ? error.message : 'Ekspor data gagal.')
  }
}

async function importBackup(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!window.confirm('Impor cadangan akan mengganti semua data admin yang saat ini tersimpan. Lanjutkan?')) return
  try {
    const value: unknown = JSON.parse(await file.text())
    if (await importData(value)) notify('Cadangan berhasil diimpor.')
    else notify(storageError.value || 'Cadangan tidak dapat diimpor.')
  } catch (error) {
    console.error('Gagal membaca berkas cadangan.', error)
    notify('Berkas cadangan bukan JSON yang valid.')
  }
}
</script>

<template>
  <div class="admin-app">
    <aside class="admin-sidebar">
      <NuxtLink to="/admin/dashboard" class="sidebar-logo"><span class="sidebar-logo-icon">▤</span><span><span class="sidebar-logo-text">Perpustakaan</span><span class="sidebar-logo-sub">Panel Admin</span></span></NuxtLink>
      <nav class="sidebar-nav">
        <span class="sidebar-label">Menu Utama</span>
        <NuxtLink v-for="(link, index) in sidebarLinks" :key="link.to" :to="link.to" class="sidebar-item" :class="{ active: current === link.key }">
          <span class="admin-nav-icon">{{ ['▦', '▤', '♙', '↗', '⇩'][index] }}</span>{{ link.label }}
          <span v-if="link.key === 'usulan' || link.key === 'sumbangan'" class="badge badge--active">{{ link.key === 'usulan' ? proposals.filter(item => item.status === 'Menunggu').length : donations.filter(item => item.status === 'Menunggu').length }}</span>
        </NuxtLink>
      </nav>
      <div class="sidebar-footer"><div class="sidebar-user"><span class="sidebar-avatar">AD</span><span><span class="sidebar-user-name">Admin</span><span class="sidebar-user-role">Data tersimpan di browser</span></span></div></div>
    </aside>

    <main class="admin-main">
      <header class="admin-topbar">
        <h1 class="admin-topbar__title">{{ title }}</h1>
        <div class="admin-topbar__controls">
          <label class="btn btn--ghost backup-import">Impor cadangan<input type="file" accept="application/json,.json" @change="importBackup" /></label>
          <button class="btn btn--ghost" type="button" @click="exportLocalData">Ekspor data</button>
          <NuxtLink to="/" class="btn btn--ghost">← Situs Publik</NuxtLink>
        </div>
      </header>

      <section class="admin-content">
        <p v-if="storageError" class="admin-alert admin-alert--error" role="alert">{{ storageError }}</p>
        <p v-if="catalogError" class="admin-alert admin-alert--error" role="alert">Katalog backend gagal dimuat: {{ catalogError }}</p>
        <p v-else-if="ready && !catalog.length" class="admin-alert" role="status">Tidak ada buku aktif di backend. Periksa status koleksi di basis data.</p>
        <p v-if="message" class="admin-alert" role="status">{{ message }}</p>

        <template v-if="current === 'dashboard'">
          <div class="stat-grid">
            <article v-for="stat in stats" :key="stat.label" class="stat-card">
              <span class="stat-card__icon">{{ stat.icon }}</span><span class="stat-card__label">{{ stat.label }}</span>
              <strong class="stat-card__value">{{ stat.value }}</strong><span class="stat-card__delta">{{ stat.note }}</span>
            </article>
          </div>
          <section class="section-card dashboard-panel">
            <div class="dashboard-panel__heading"><div><h2>Perlu ditinjau</h2><p>{{ pendingCount }} permintaan menunggu keputusan</p></div><NuxtLink to="/admin/usulan" class="btn btn--secondary btn--sm">Tinjau usulan</NuxtLink></div>
            <p v-if="!pendingCount" class="dashboard-empty">Belum ada usulan atau sumbangan yang menunggu.</p>
            <div v-else class="dashboard-queue">
              <NuxtLink v-if="proposals.some(item => item.status === 'Menunggu')" to="/admin/usulan">Usulan buku <strong>{{ proposals.filter(item => item.status === 'Menunggu').length }}</strong></NuxtLink>
              <NuxtLink v-if="donations.some(item => item.status === 'Menunggu')" to="/admin/sumbangan">Sumbangan buku <strong>{{ donations.filter(item => item.status === 'Menunggu').length }}</strong></NuxtLink>
            </div>
          </section>
          <section class="section-card table-wrap">
            <div class="table-header"><h2 class="table-title">Buku terbaru</h2><NuxtLink to="/admin/kelola-buku" class="btn btn--secondary btn--sm">Kelola katalog</NuxtLink></div>
            <div class="table-scroll"><table><thead><tr><th>Judul</th><th>Penulis</th><th>Kategori</th><th>Tahun</th></tr></thead><tbody>
              <tr v-for="book in catalog.slice(0, 5)" :key="book.id"><td><strong>{{ book.title }}</strong></td><td>{{ book.author }}</td><td>{{ book.genre }}</td><td>{{ book.year }}</td></tr>
              <tr v-if="!catalog.length" class="table-empty"><td colspan="4">Belum ada buku dalam katalog.</td></tr>
            </tbody></table></div>
          </section>
        </template>

        <template v-else-if="current === 'kelola-buku'">
          <section class="section-card table-wrap">
            <div class="table-header"><div><h2 class="table-title">Katalog buku</h2><p class="table-subtitle">{{ catalog.length }} buku tersimpan</p></div><div class="table-actions"><label class="table-search"><span aria-hidden="true">⌕</span><input v-model="search" type="search" placeholder="Cari buku" aria-label="Cari buku" /></label><button class="btn btn--primary btn--sm" type="button" @click="startNewBook">+ Tambah buku</button></div></div>
            <div class="table-scroll"><table><thead><tr><th>Buku</th><th>Penulis</th><th>Kategori</th><th>Tahun</th><th>File</th><th>Aksi</th></tr></thead><tbody>
              <tr v-for="book in filteredBooks" :key="book.id">
                <td><div class="admin-book-cell"><img v-if="book.cover" :src="book.cover" :alt="`Sampul ${book.title}`" /><span><strong>{{ book.title }}</strong><small>{{ book.description }}</small></span></div></td>
                <td>{{ book.author }}</td><td>{{ book.genre }}</td><td>{{ book.year }}</td>
                <td><a v-if="book.pdf" :href="book.pdf" :download="book.pdfName || `${book.seed}.pdf`" class="file-link">Unduh PDF</a><span v-else class="muted-text">—</span></td>
                <td><div class="admin-row-actions"><button class="action-btn" type="button" :aria-label="`Edit ${book.title}`" @click="editBook(book)">✎</button><button class="action-btn danger" type="button" :aria-label="`Hapus ${book.title}`" @click="deleteBook(book)">×</button></div></td>
              </tr>
              <tr v-if="!filteredBooks.length" class="table-empty"><td colspan="6">Tidak ada buku yang cocok dengan pencarian.</td></tr>
            </tbody></table></div>
          </section>
        </template>

        <template v-else-if="current === 'kelola-pengguna'">
          <section class="section-card user-create">
            <div><h2 class="table-title">Tambah anggota</h2><p class="table-subtitle">Buat catatan pengguna lokal untuk pengelolaan admin.</p></div>
            <form class="user-create__form" @submit.prevent="addUser"><label><span>Nama</span><input v-model="userName" class="form-input" required minlength="2" placeholder="Nama anggota" /></label><label><span>Email</span><input v-model="userEmail" class="form-input" required type="email" placeholder="nama@email.com" /></label><button class="btn btn--primary btn--sm" type="submit">Tambah anggota</button></form>
          </section>
          <section class="section-card table-wrap">
            <div class="table-header"><div><h2 class="table-title">Pengguna</h2><p class="table-subtitle">{{ users.length }} anggota tersimpan</p></div><label class="table-search"><span aria-hidden="true">⌕</span><input v-model="search" type="search" placeholder="Cari anggota" aria-label="Cari anggota" /></label></div>
            <div class="table-scroll"><table><thead><tr><th>Nama</th><th>Email</th><th>Peran</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
              <tr v-for="user in filteredUsers" :key="user.id"><td><strong>{{ user.name }}</strong></td><td>{{ user.email }}</td><td>{{ user.role }}</td><td><span class="status" :class="user.status === 'Aktif' ? 'status--active' : 'status--rejected'">{{ user.status }}</span></td><td><div class="admin-row-actions"><button class="btn btn--secondary btn--sm" type="button" @click="toggleUser(user)">{{ user.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan' }}</button><button class="action-btn danger" type="button" :aria-label="`Hapus ${user.name}`" @click="deleteUser(user)">×</button></div></td></tr>
              <tr v-if="!filteredUsers.length" class="table-empty"><td colspan="5">Belum ada anggota. Tambahkan melalui formulir di atas.</td></tr>
            </tbody></table></div>
          </section>
        </template>

        <template v-else-if="current === 'usulan'">
          <section class="section-card table-wrap">
            <div class="table-header"><div><h2 class="table-title">Usulan buku</h2><p class="table-subtitle">{{ proposals.length }} usulan masuk</p></div><label class="table-search"><span aria-hidden="true">⌕</span><input v-model="search" type="search" placeholder="Cari usulan" aria-label="Cari usulan" /></label></div>
            <div class="table-scroll"><table><thead><tr><th>Buku</th><th>Pengusul</th><th>Catatan</th><th>Tanggal</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
              <tr v-for="proposal in filteredProposals" :key="proposal.id"><td><strong>{{ proposal.title }}</strong><small class="table-secondary">{{ proposal.author }} · {{ proposal.genre }}</small></td><td>Pengunjung</td><td>{{ proposal.note || '—' }}</td><td>{{ formatDate(proposal.createdAt) }}</td><td><span class="status" :class="proposal.status === 'Disetujui' ? 'status--active' : proposal.status === 'Ditolak' ? 'status--rejected' : 'status--pending'">{{ proposal.status }}</span></td><td><div class="admin-row-actions"><button class="btn btn--primary btn--sm" type="button" :disabled="proposal.status === 'Disetujui'" @click="reviewProposal(proposal, 'Disetujui')">Setujui</button><button class="btn btn--secondary btn--sm" type="button" :disabled="proposal.status === 'Ditolak'" @click="reviewProposal(proposal, 'Ditolak')">Tolak</button><button class="action-btn danger" type="button" :aria-label="`Hapus usulan ${proposal.title}`" @click="deleteProposal(proposal)">×</button></div></td></tr>
              <tr v-if="!filteredProposals.length" class="table-empty"><td colspan="6">Belum ada usulan buku.</td></tr>
            </tbody></table></div>
          </section>
        </template>

        <template v-else-if="current === 'sumbangan'">
          <section class="section-card table-wrap">
            <div class="table-header"><div><h2 class="table-title">Sumbangan buku</h2><p class="table-subtitle">{{ donations.length }} sumbangan masuk</p></div><label class="table-search"><span aria-hidden="true">⌕</span><input v-model="search" type="search" placeholder="Cari sumbangan" aria-label="Cari sumbangan" /></label></div>
            <div class="table-scroll"><table><thead><tr><th>Buku</th><th>Penyumbang</th><th>Jumlah</th><th>Catatan</th><th>Tanggal</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
              <tr v-for="donation in filteredDonations" :key="donation.id"><td><strong>{{ donation.title }}</strong><small class="table-secondary">{{ donation.author }} · {{ donation.genre }}</small></td><td>{{ donation.donor }}<small class="table-secondary">{{ donation.email }}</small></td><td>{{ donation.quantity }}</td><td>{{ donation.note || '—' }}</td><td>{{ formatDate(donation.createdAt) }}</td><td><span class="status" :class="donation.status === 'Disetujui' ? 'status--active' : donation.status === 'Ditolak' ? 'status--rejected' : 'status--pending'">{{ donation.status }}</span></td><td><div class="admin-row-actions"><button class="btn btn--primary btn--sm" type="button" :disabled="donation.status === 'Disetujui'" @click="reviewDonation(donation, 'Disetujui')">Terima</button><button class="btn btn--secondary btn--sm" type="button" :disabled="donation.status === 'Ditolak'" @click="reviewDonation(donation, 'Ditolak')">Tolak</button><button class="action-btn danger" type="button" :aria-label="`Hapus sumbangan ${donation.title}`" @click="deleteDonation(donation)">×</button></div></td></tr>
              <tr v-if="!filteredDonations.length" class="table-empty"><td colspan="7">Belum ada informasi sumbangan.</td></tr>
            </tbody></table></div>
          </section>
        </template>
      </section>
    </main>

    <div v-if="showBookForm" class="admin-modal-backdrop" @click.self="showBookForm = false">
      <section class="admin-modal" role="dialog" aria-modal="true" aria-labelledby="book-form-title">
        <header class="admin-modal__header"><div><p class="eyebrow">Katalog digital</p><h2 id="book-form-title">{{ bookForm.id ? 'Edit buku' : 'Tambah buku' }}</h2></div><button class="action-btn" type="button" aria-label="Tutup formulir" @click="showBookForm = false">×</button></header>
        <form class="admin-book-form" @submit.prevent="submitBook">
          <label><span>Judul buku *</span><input v-model="bookForm.title" class="form-input" required maxlength="160" /></label>
          <div class="form-row"><label><span>Penulis *</span><input v-model="bookForm.author" class="form-input" required maxlength="120" /></label><label><span>Kategori *</span><select v-model="bookForm.genre" class="form-select" required><option v-for="genre in ['Fiksi', 'Sastra', 'Sejarah', 'Biografi', 'Ilmu Pengetahuan', 'Anak-anak', 'Lokal & Budaya Jawa', 'Agama']" :key="genre">{{ genre }}</option></select></label></div>
          <label><span>Tahun terbit *</span><input v-model.number="bookForm.year" class="form-input" type="number" min="0" :max="new Date().getFullYear() + 1" required /></label>
          <label><span>Deskripsi *</span><textarea v-model="bookForm.description" class="form-textarea" rows="3" required maxlength="1000" /></label>
          <label><span>Sampul buku (gambar, maks. 2 MB)</span><input class="file-input" type="file" accept="image/*" @change="readFile($event, 'cover')" /></label>
          <img v-if="bookForm.cover" class="book-cover-preview" :src="bookForm.cover" alt="Pratinjau sampul buku" />
          <label><span>File buku (PDF, maks. 10 MB)</span><input class="file-input" type="file" accept="application/pdf,.pdf" @change="readFile($event, 'pdf')" /></label>
          <p v-if="bookForm.pdfName" class="selected-file">File terpilih: {{ bookForm.pdfName }} <button type="button" class="text-button" @click="pdfFile = null; pdfChanged = true; bookForm.pdf = ''; bookForm.pdfName = ''">Hapus file</button></p>
          <p v-if="uploadError" class="admin-alert admin-alert--error" role="alert">{{ uploadError }}</p>
          <footer class="admin-modal__actions"><button class="btn btn--secondary" type="button" @click="showBookForm = false">Batal</button><button class="btn btn--primary" type="submit">Simpan buku</button></footer>
        </form>
      </section>
    </div>
  </div>
</template>

<style scoped>
.admin-nav-icon { display: inline-grid; width: 1.2rem; place-items: center; font-size: 1rem; }
.admin-alert { padding: 0.75rem 1rem; border: 1px solid var(--color-border); border-radius: var(--radius-sm); color: var(--color-text); font-size: 0.85rem; }
.admin-alert--error { border-color: #d64545; color: #d64545; }
.table-subtitle,.table-secondary,.muted-text { display: block; margin-top: 0.25rem; color: var(--color-text-muted); font-size: 0.75rem; }
.admin-book-cell { display: flex; align-items: center; gap: 0.7rem; min-width: 200px; }
.admin-book-cell img { width: 38px; height: 52px; border-radius: 4px; object-fit: cover; }
.admin-book-cell small { display: -webkit-box; overflow: hidden; max-width: 270px; margin-top: 0.2rem; color: var(--color-text-muted); font-size: 0.7rem; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.admin-row-actions { display: flex; align-items: center; gap: 0.4rem; }
.file-link,.text-button { color: var(--color-accent); font-size: 0.8rem; }
.backup-import { position: relative; overflow: hidden; cursor: pointer; }
.backup-import input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.user-create { display: grid; gap: 1rem; padding: 1.2rem 1.5rem; }
.user-create__form { display: flex; align-items: end; gap: 0.8rem; }
.user-create__form label,.admin-book-form label { display: grid; flex: 1; gap: 0.35rem; color: var(--color-text-muted); font-size: 0.8rem; }
.dashboard-panel { padding: 1.25rem 1.5rem; }
.dashboard-panel__heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.dashboard-panel__heading h2 { font-size: 1rem; }
.dashboard-panel__heading p,.dashboard-empty { margin-top: 0.3rem; color: var(--color-text-muted); font-size: 0.8rem; }
.dashboard-queue { display: flex; flex-wrap: wrap; gap: 0.8rem; margin-top: 1.1rem; }
.dashboard-queue a { display: flex; min-width: 180px; justify-content: space-between; gap: 1.5rem; padding: 0.7rem 0.9rem; border: 1px solid var(--color-border); border-radius: var(--radius-sm); color: var(--color-text); font-size: 0.82rem; }
.dashboard-queue strong { color: var(--color-accent); }
.admin-modal-backdrop { position: fixed; z-index: 1000; inset: 0; display: grid; place-items: center; overflow: auto; padding: 1rem; background: rgba(0, 0, 0, 0.58); }
.admin-modal { width: min(100%, 620px); max-height: min(92dvh, 850px); overflow: auto; padding: 1.4rem; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-bg); box-shadow: var(--shadow-modal); }
.admin-modal__header,.admin-modal__actions { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.admin-modal__header { margin-bottom: 1.2rem; }
.admin-modal__header h2 { font-size: 1.2rem; }
.admin-book-form { display: grid; gap: 1rem; }
.admin-book-form > .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.admin-book-form .form-input,.admin-book-form .form-select,.admin-book-form .form-textarea { width: 100%; }
.file-input { width: 100%; padding: 0.45rem; border: 1px dashed var(--color-border); border-radius: var(--radius-sm); color: var(--color-text-muted); }
.book-cover-preview { width: 90px; height: 125px; border-radius: 4px; object-fit: cover; }
.selected-file { color: var(--color-text-muted); font-size: 0.78rem; }
.text-button { margin-left: 0.5rem; border: 0; background: none; cursor: pointer; }
.admin-modal__actions { justify-content: end; padding-top: 0.4rem; }
@media (max-width: 680px) {
  .user-create__form { align-items: stretch; flex-direction: column; }
  .admin-book-form > .form-row { grid-template-columns: 1fr; }
}
</style>
