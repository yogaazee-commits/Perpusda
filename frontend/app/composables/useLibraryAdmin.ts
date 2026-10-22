import type { Book } from '../data/books'
import { createPdfStorageKey, deletePdf, getPdf, savePdf } from '../utils/pdfStorage'
import { apiFetch } from './useApi'

export type ReviewStatus = 'Menunggu' | 'Disetujui' | 'Ditolak'

export interface BookProposal {
  id: number
  title: string
  author: string
  genre: string
  note: string
  status: ReviewStatus
  createdAt: string
}

export interface BookDonation {
  id: number
  title: string
  author: string
  genre: string
  quantity: number
  donor: string
  email: string
  note: string
  status: ReviewStatus
  createdAt: string
}

export interface LibraryUser {
  id: number
  name: string
  email: string
  role: 'Admin' | 'Anggota'
  status: 'Aktif' | 'Nonaktif'
}

interface AdminData {
  books: Book[]
  proposals: BookProposal[]
  donations: BookDonation[]
  users: LibraryUser[]
}

interface BackendBook {
  id: string
  judul: string
  penulis: string
  penerbit?: string | null
  tahunTerbit?: number | null
  filePdf?: string | null
  kategori?: { nama: string } | null
  jenisLiteratur?: { nama: string } | null
  totalDibaca?: number
}

interface BackendBooksResponse {
  success: boolean
  data: BackendBook[]
}

const STORAGE_KEY = 'pdk-admin-data'

function fromBackendBook(item: BackendBook, apiBase: string): Book {
  const readCount = item.totalDibaca ?? 0
  const reads = readCount >= 1000
    ? `${(readCount / 1000).toFixed(1).replace(/\.0$/, '')} rb`
    : String(readCount)
  return {
    id: item.id,
    title: item.judul,
    author: item.penulis,
    genre: item.kategori?.nama || item.jenisLiteratur?.nama || 'Umum',
    year: item.tahunTerbit || 0,
    reads,
    readCount,
    seed: item.judul.toLocaleLowerCase('id').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    description: item.penerbit ? `Diterbitkan oleh ${item.penerbit}.` : 'Koleksi Perpustakaan Digital Karanganyar.',
    pdf: item.filePdf ? `${apiBase}/buku/${encodeURIComponent(item.id)}/pdf` : undefined,
    pdfName: item.filePdf || undefined,
  }
}

export function useLibraryAdmin() {
  const apiBase = useRuntimeConfig().public.apiBase
  const catalog = useState<Book[]>('admin-catalog', () => [])
  const proposals = useState<BookProposal[]>('admin-proposals', () => [])
  const donations = useState<BookDonation[]>('admin-donations', () => [])
  const users = useState<LibraryUser[]>('admin-users', () => [])
  const ready = useState('admin-data-ready', () => false)
  const storageError = useState('admin-storage-error', () => '')
  const catalogError = useState('backend-catalog-error', () => '')

  onMounted(async () => {
    if (ready.value) return
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored) as Partial<AdminData>
        if (!Array.isArray(data.books) || !Array.isArray(data.proposals) || !Array.isArray(data.donations) || !Array.isArray(data.users)) {
          throw new Error('Struktur data admin tidak valid.')
        }
        const loadedBooks: Book[] = []
        for (const book of data.books) {
          if (book.pdf?.startsWith('data:application/pdf')) {
            const legacyKey = createPdfStorageKey()
            const response = await fetch(book.pdf)
            await savePdf(legacyKey, await response.blob())
            const file = await getPdf(legacyKey)
            if (!file) throw new Error(`PDF untuk buku "${book.title}" gagal dimigrasikan ke penyimpanan browser.`)
            const { pdf: _legacyPdf, ...metadata } = book
            loadedBooks.push({ ...metadata, pdfStorageKey: legacyKey, pdf: URL.createObjectURL(file) })
          } else if (book.pdfStorageKey) {
            const file = await getPdf(book.pdfStorageKey)
            if (!file) throw new Error(`PDF untuk buku "${book.title}" tidak ditemukan di penyimpanan browser.`)
            loadedBooks.push({ ...book, pdf: URL.createObjectURL(file) })
          } else {
            loadedBooks.push(book)
          }
        }
        catalog.value = loadedBooks
        proposals.value = data.proposals
        donations.value = data.donations
        users.value = data.users
        if (data.books.some(book => Boolean(book.pdf?.startsWith('data:application/pdf')))) {
          if (!commit({ books: loadedBooks })) {
            throw new Error(storageError.value)
          }
        }
      }
    } catch (error) {
      console.error('Gagal membaca data admin tersimpan.', error)
      storageError.value = error instanceof Error
        ? `Data tersimpan tidak dapat dibaca: ${error.message}`
        : 'Data tersimpan tidak dapat dibaca. Impor cadangan yang valid sebelum menyimpan perubahan.'
    }
    try {
      const response = await apiFetch<BackendBooksResponse>('/buku')
      if (!response.success || !Array.isArray(response.data)) {
        throw new Error('Server mengembalikan format katalog yang tidak valid.')
      }
      catalog.value = response.data.map(item => fromBackendBook(item, apiBase))
      catalogError.value = ''
    } catch (error) {
      console.error('Gagal memuat katalog dari backend.', error)
      catalogError.value = error instanceof Error ? error.message : 'Katalog backend tidak dapat dimuat.'
    }
    ready.value = true
  })

  function commit(next: Partial<AdminData>) {
    const data: AdminData = {
      books: next.books ?? catalog.value,
      proposals: next.proposals ?? proposals.value,
      donations: next.donations ?? donations.value,
      users: next.users ?? users.value,
    }
    try {
      const storedBooks = data.books.map(({ pdf: _pdf, ...book }) => book)
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, books: storedBooks }))
      catalog.value = data.books
      proposals.value = data.proposals
      donations.value = data.donations
      users.value = data.users
      storageError.value = ''
      return true
    } catch (error) {
      console.error('Gagal menyimpan perubahan admin.', error)
      storageError.value = 'Penyimpanan browser penuh atau tidak tersedia. Hapus file besar atau ekspor data sebelum mencoba lagi.'
      return false
    }
  }

  function nextId(items: { id: number }[]) {
    return Math.max(0, ...items.map(item => item.id)) + 1
  }

  function recordBookRead(id: number | string) {
    const book = catalog.value.find(item => item.id === id)
    if (!book) {
      console.error(`Buku dengan ID ${id} tidak ditemukan untuk pencatatan pembacaan.`)
      return false
    }

    const normalizedReads = book.reads.trim().toLocaleLowerCase('id').replace(',', '.')
    const reads = Number.parseFloat(normalizedReads)
    const savedReadCount = book.readCount
    if (savedReadCount !== undefined && (!Number.isSafeInteger(savedReadCount) || savedReadCount < 0)) {
      console.error(`Jumlah pembacaan buku "${book.title}" tidak valid: "${savedReadCount}".`)
      return false
    }
    if (savedReadCount === undefined && (!Number.isFinite(reads) || reads < 0)) {
      console.error(`Jumlah pembacaan buku "${book.title}" tidak valid: "${book.reads}".`)
      return false
    }

    const currentCount = savedReadCount
      ?? reads * (/(?:rb|ribu|k)$/.test(normalizedReads) ? 1000 : 1)
    const nextCount = Math.floor(currentCount) + 1
    const formattedCount = nextCount >= 1000
      ? `${(nextCount / 1000).toFixed(1).replace(/\.0$/, '')} rb`
      : String(nextCount)

    const saved = commit({
      books: catalog.value.map(item => item.id === id ? { ...item, reads: formattedCount, readCount: nextCount } : item),
    })
    if (saved && typeof id === 'string') {
      void apiFetch(`/buku/${encodeURIComponent(id)}/baca`, { method: 'POST' }).catch((error) => {
        console.error(`Gagal mencatat pembacaan buku ${id} di backend.`, error)
      })
    }
    return saved
  }

  async function cleanupPdf(key: string, message: string) {
    try {
      await deletePdf(key)
    } catch (error) {
      console.error(message, error)
      storageError.value = 'Sebagian file PDF sementara belum dapat dibersihkan dari penyimpanan browser.'
    }
  }

  async function saveBook(book: Omit<Book, 'id' | 'pdfStorageKey'> & { id?: number | string; pdfStorageKey?: string; pdfFile?: Blob; removePdf?: boolean }) {
    const id = book.id ?? nextId(catalog.value.filter((item): item is Book & { id: number } => typeof item.id === 'number'))
    const previous = catalog.value.find(item => item.id === id)
    const { pdfFile, removePdf, ...bookData } = book
    let pdfStorageKey = previous?.pdfStorageKey
    let pdf = previous?.pdf
    let pdfName = bookData.pdfName || previous?.pdfName

    try {
      if (pdfFile) {
        pdfStorageKey = undefined
        pdf = undefined
        pdfName = bookData.pdfName
      } else if (removePdf) {
        pdfStorageKey = undefined
        pdf = undefined
        pdfName = undefined
      }

      const body = new FormData()
      body.set('judul', bookData.title)
      body.set('penulis', bookData.author)
      body.set('penerbit', bookData.description)
      body.set('tahunTerbit', String(bookData.year))
      body.set('isGratis', 'true')
      if (pdfFile) body.set('filePdf', pdfFile, bookData.pdfName || 'buku.pdf')
      if (removePdf) body.set('hapusPdf', 'true')

      const isUpdate = previous && typeof id === 'string'
      const response = await apiFetch<{ success: boolean; error?: string; data: BackendBook }>(
        isUpdate ? `/buku/${encodeURIComponent(id)}` : '/buku',
        { method: isUpdate ? 'PUT' : 'POST', body },
      )
      if (!response.success || !response.data) throw new Error(response.error || 'Server gagal menyimpan buku.')
      const savedBook: Book = {
        ...fromBackendBook(response.data, apiBase),
        readCount: bookData.readCount ?? previous?.readCount,
      }
      const nextBooks = previous
        ? catalog.value.map(item => item.id === id ? savedBook : item)
        : [savedBook, ...catalog.value]
      if (!commit({ books: nextBooks })) {
        return false
      }

      if (previous?.pdfStorageKey && previous.pdfStorageKey !== pdfStorageKey) {
        await cleanupPdf(previous.pdfStorageKey, 'PDF lama tidak dapat dihapus dari penyimpanan.')
      }
      if (pdfFile && previous?.pdf) URL.revokeObjectURL(previous.pdf)
      return true
    } catch (error) {
      console.error('Gagal menyimpan buku atau file PDF.', error)
      storageError.value = error instanceof Error ? error.message : 'Buku gagal disimpan ke backend.'
      return false
    }
  }

  async function removeBook(id: number | string) {
    const book = catalog.value.find(item => item.id === id)
    if (typeof id === 'string') {
      try {
        await apiFetch(`/buku/${encodeURIComponent(id)}`, { method: 'DELETE' })
      } catch (error) {
        console.error(`Gagal menghapus buku ${id} dari backend.`, error)
        storageError.value = error instanceof Error ? error.message : 'Buku gagal dihapus dari backend.'
        return false
      }
    }
    if (!commit({ books: catalog.value.filter(item => item.id !== id) })) return false
    if (book?.pdfStorageKey) await cleanupPdf(book.pdfStorageKey, 'PDF buku yang dihapus tidak dapat dibersihkan dari penyimpanan.')
    if (book?.pdf) URL.revokeObjectURL(book.pdf)
    return true
  }

  function addProposal(proposal: Omit<BookProposal, 'id' | 'status' | 'createdAt'>) {
    const item: BookProposal = { ...proposal, id: nextId(proposals.value), status: 'Menunggu', createdAt: new Date().toISOString() }
    return commit({ proposals: [item, ...proposals.value] })
  }

  function updateProposal(id: number, status: ReviewStatus) {
    const proposal = proposals.value.find(item => item.id === id)
    if (!proposal) return false
    let nextBooks = catalog.value
    if (status === 'Disetujui' && !catalog.value.some(book => book.title.toLocaleLowerCase('id') === proposal.title.toLocaleLowerCase('id'))) {
      const seed = proposal.title.toLocaleLowerCase('id').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      nextBooks = [{
        id: nextId(catalog.value.filter((book): book is Book & { id: number } => typeof book.id === 'number')),
        title: proposal.title,
        author: proposal.author,
        genre: proposal.genre,
        year: new Date().getFullYear(),
        reads: '0',
        seed,
        description: proposal.note || `Buku usulan dari pengunjung: ${proposal.title}.`,
      }, ...catalog.value]
    }
    return commit({
      books: nextBooks,
      proposals: proposals.value.map(item => item.id === id ? { ...item, status } : item),
    })
  }

  function removeProposal(id: number) {
    return commit({ proposals: proposals.value.filter(item => item.id !== id) })
  }

  function addDonation(donation: Omit<BookDonation, 'id' | 'status' | 'createdAt'>) {
    const item: BookDonation = { ...donation, id: nextId(donations.value), status: 'Menunggu', createdAt: new Date().toISOString() }
    return commit({ donations: [item, ...donations.value] })
  }

  function updateDonation(id: number, status: ReviewStatus) {
    const donation = donations.value.find(item => item.id === id)
    if (!donation) return false
    let nextBooks = catalog.value
    if (status === 'Disetujui' && !catalog.value.some(book => book.title.toLocaleLowerCase('id') === donation.title.toLocaleLowerCase('id'))) {
      const seed = donation.title.toLocaleLowerCase('id').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      nextBooks = [{
        id: nextId(catalog.value.filter((book): book is Book & { id: number } => typeof book.id === 'number')),
        title: donation.title,
        author: donation.author,
        genre: donation.genre,
        year: new Date().getFullYear(),
        reads: '0',
        seed,
        description: donation.note || `Buku sumbangan dari ${donation.donor}.`,
      }, ...catalog.value]
    }
    return commit({
      books: nextBooks,
      donations: donations.value.map(item => item.id === id ? { ...item, status } : item),
    })
  }

  function removeDonation(id: number) {
    return commit({ donations: donations.value.filter(item => item.id !== id) })
  }

  function saveUser(user: Omit<LibraryUser, 'id'> & { id?: number }) {
    const id = user.id ?? nextId(users.value)
    const exists = users.value.some(item => item.id === id)
    const nextUsers = exists
      ? users.value.map(item => item.id === id ? { ...user, id } : item)
      : [{ ...user, id }, ...users.value]
    return commit({ users: nextUsers })
  }

  function removeUser(id: number) {
    return commit({ users: users.value.filter(user => user.id !== id) })
  }

  async function exportData() {
    const books = await Promise.all(catalog.value.map(async (book) => {
      if (!book.pdfStorageKey) return book
      const file = await getPdf(book.pdfStorageKey)
      if (!file) throw new Error(`PDF untuk buku "${book.title}" tidak ditemukan.`)
      const pdf = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Gagal menyiapkan PDF untuk cadangan.'))
        reader.onerror = () => reject(reader.error || new Error('Gagal membaca PDF untuk cadangan.'))
        reader.readAsDataURL(file)
      })
      const { pdfStorageKey: _pdfStorageKey, ...metadata } = book
      return { ...metadata, pdf }
    }))
    const blob = new Blob([JSON.stringify({
      books,
      proposals: proposals.value,
      donations: donations.value,
      users: users.value,
    }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'perpusda-data.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  async function importData(value: unknown) {
    const storedKeys: string[] = []
    try {
      if (!value || typeof value !== 'object') throw new Error('Format berkas cadangan tidak valid.')
      const data = value as Partial<AdminData>
      if (!Array.isArray(data.books) || !Array.isArray(data.proposals) || !Array.isArray(data.donations) || !Array.isArray(data.users)) {
        throw new Error('Cadangan harus berisi koleksi buku, usulan, sumbangan, dan pengguna.')
      }
      if (!data.books.every(book => book && (typeof book.id === 'string' || Number.isFinite(book.id)) && typeof book.title === 'string' && typeof book.author === 'string' && typeof book.genre === 'string' && Number.isFinite(book.year) && typeof book.reads === 'string' && (book.readCount === undefined || (Number.isSafeInteger(book.readCount) && book.readCount >= 0)) && typeof book.seed === 'string' && typeof book.description === 'string')) {
        throw new Error('Data buku di dalam cadangan tidak valid.')
      }
      if (!data.proposals.every(item => item && Number.isFinite(item.id) && typeof item.title === 'string' && typeof item.author === 'string' && typeof item.genre === 'string' && typeof item.status === 'string' && typeof item.createdAt === 'string')) {
        throw new Error('Data usulan di dalam cadangan tidak valid.')
      }
      if (!data.donations.every(item => item && Number.isFinite(item.id) && typeof item.title === 'string' && typeof item.author === 'string' && typeof item.genre === 'string' && Number.isFinite(item.quantity) && typeof item.donor === 'string' && typeof item.email === 'string' && typeof item.status === 'string' && typeof item.createdAt === 'string')) {
        throw new Error('Data sumbangan di dalam cadangan tidak valid.')
      }
      if (!data.users.every(user => user && Number.isFinite(user.id) && typeof user.name === 'string' && typeof user.email === 'string' && (user.role === 'Admin' || user.role === 'Anggota') && (user.status === 'Aktif' || user.status === 'Nonaktif'))) {
        throw new Error('Data pengguna di dalam cadangan tidak valid.')
      }
      const importedBooks: Book[] = []
      for (const book of data.books) {
        if (book.pdf?.startsWith('data:application/pdf')) {
          const key = createPdfStorageKey()
          const response = await fetch(book.pdf)
          await savePdf(key, await response.blob())
          storedKeys.push(key)
          const { pdf: _pdf, pdfStorageKey: _pdfStorageKey, ...metadata } = book
          const file = await getPdf(key)
          if (!file) throw new Error(`PDF untuk buku "${book.title}" gagal disimpan saat impor.`)
          importedBooks.push({ ...metadata, pdfStorageKey: key, pdf: URL.createObjectURL(file) })
        } else {
          importedBooks.push(book)
        }
      }
      const previousPdfKeys = catalog.value
        .map(book => book.pdfStorageKey)
        .filter((key): key is string => Boolean(key))
      if (!commit({ ...data, books: importedBooks })) {
        await Promise.all(storedKeys.map(key => cleanupPdf(key, 'PDF impor gagal dibersihkan setelah proses impor dibatalkan.')))
        return false
      }
      const retainedKeys = new Set(importedBooks.map(book => book.pdfStorageKey).filter((key): key is string => Boolean(key)))
      const removedKeys = previousPdfKeys.filter(key => !retainedKeys.has(key))
      await Promise.all(removedKeys.map(key => cleanupPdf(key, 'PDF lama gagal dibersihkan setelah impor cadangan.')))
      return true
    } catch (error) {
      await Promise.all(storedKeys.map(key => cleanupPdf(key, 'PDF impor gagal dibersihkan setelah proses impor gagal.')))
      console.error('Gagal mengimpor cadangan admin.', error)
      storageError.value = error instanceof Error ? error.message : 'Gagal membaca berkas cadangan.'
      return false
    }
  }

  return {
    catalog, proposals, donations, users, ready, storageError, catalogError,
    saveBook, removeBook, recordBookRead, addProposal, updateProposal, removeProposal, addDonation, updateDonation, removeDonation,
    saveUser, removeUser, exportData, importData,
  }
}
