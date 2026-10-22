<script setup lang="ts">
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist'
import type { PageFlip } from 'page-flip'

const props = withDefaults(defineProps<{
  source: string
  title: string
  author?: string
  category?: string
  cover?: string
  pages?: string[]
}>(), {
  author: '',
  category: '',
  pages: () => [],
})

const bookElement = ref<HTMLElement>()
const pageFlip = shallowRef<PageFlip>()
const loadingTaskRef = shallowRef<PDFDocumentLoadingTask>()
const documentRef = shallowRef<PDFDocumentProxy>()
const pdfPageCount = ref(0)
const textPageCount = computed(() => props.pages.length)
const hasCover = computed(() => Boolean(props.source))
const pageCount = computed(() => pdfPageCount.value + (hasCover.value ? 1 : 0) || textPageCount.value)
const currentPageIndex = ref(0)
const orientation = ref<'portrait' | 'landscape'>('landscape')
const loading = ref(false)
const error = ref('')
const bookGeneration = ref(0)
const zoom = ref(100)
const coverImageError = ref(false)
const pageCanvases = new Map<number, HTMLCanvasElement>()
const renderedPages = new Set<number>()
const renderTasks = new Map<number, { cancel: () => void }>()
const renderPromises = new Map<number, Promise<void>>()
let requestNumber = 0

watch(() => props.cover, () => { coverImageError.value = false })

const bookPages = computed(() => Array.from({ length: pageCount.value }, (_, index) => index))
const isPortrait = computed(() => orientation.value === 'portrait')
function getPageStep(index: number) {
  return isPortrait.value || (hasCover.value && index === 0 && pageCount.value > 1) ? 1 : 2
}
const pageRange = computed(() => {
  if (!pageCount.value) return '—'
  if (hasCover.value && currentPageIndex.value === 0) return `Sampul / ${pdfPageCount.value}`
  const first = currentPageIndex.value + (hasCover.value ? 0 : 1)
  const last = Math.min(first + (isPortrait.value ? 0 : 1), pdfPageCount.value || textPageCount.value)
  const totalPages = pdfPageCount.value || textPageCount.value
  return first === last ? `${first} / ${totalPages}` : `${first}–${last} / ${totalPages}`
})
const canGoPrevious = computed(() => currentPageIndex.value > 0 && !loading.value)
const canGoNext = computed(() => currentPageIndex.value + getPageStep(currentPageIndex.value) < pageCount.value && !loading.value)
const bookDetailRoute = computed(() => ({ path: '/buku-detail', query: { judul: props.title } }))
const progress = computed(() => pageCount.value
  ? hasCover.value && currentPageIndex.value === 0
    ? 0
    : Math.round((Math.min(currentPageIndex.value + getPageStep(currentPageIndex.value) - (hasCover.value ? 1 : 0), pdfPageCount.value || textPageCount.value) / (pdfPageCount.value || textPageCount.value)) * 100)
  : 0)
const bookStyle = computed(() => ({ '--reader-zoom': `${zoom.value / 100}` }))

function getPdfPageNumber(bookPageIndex: number) {
  return bookPageIndex + (hasCover.value ? 0 : 1)
}

function setCanvasRef(bookPageIndex: number, element: Element | null) {
  const pageNumber = getPdfPageNumber(bookPageIndex)
  if (pageNumber < 1) return
  if (element instanceof HTMLCanvasElement) pageCanvases.set(pageNumber, element)
  else pageCanvases.delete(pageNumber)
}

async function renderPdfPage(pageNumber: number) {
  const pdf = documentRef.value
  if (!pdf || renderedPages.has(pageNumber)) return
  const pending = renderPromises.get(pageNumber)
  if (pending) return pending

  let renderPromise: Promise<void>
  renderPromise = (async () => {
    let pageRenderTask: { cancel: () => void; promise: Promise<void> } | undefined
    try {
      let canvas = pageCanvases.get(pageNumber)
      if (!canvas) {
        await nextTick()
        canvas = pageCanvases.get(pageNumber)
      }
      if (!canvas) {
        throw new Error(`Canvas halaman ${pageNumber} belum tersedia.`)
      }

      const page = await pdf.getPage(pageNumber)
      const base = page.getViewport({ scale: 1 })
      const container = canvas.parentElement
      const width = container?.clientWidth || 460
      const height = container?.clientHeight || 640
      const scale = Math.min(width / base.width, height / base.height)
      const viewport = page.getViewport({ scale })
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Canvas halaman PDF tidak tersedia.')

      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.ceil(viewport.width * ratio)
      canvas.height = Math.ceil(viewport.height * ratio)
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`
      canvas.style.maxWidth = '100%'
      canvas.style.maxHeight = '100%'

      pageRenderTask = page.render({
        canvas,
        canvasContext: context,
        viewport,
        transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
      })
      renderTasks.set(pageNumber, pageRenderTask)
      await pageRenderTask.promise
      renderedPages.add(pageNumber)
    } catch (cause) {
      if (cause instanceof Error && cause.name === 'RenderingCancelledException') return
      console.error(`Gagal merender halaman PDF ${pageNumber}.`, cause)
      error.value = `Halaman ${pageNumber} PDF gagal ditampilkan${cause instanceof Error ? `: ${cause.message}` : '.'}`
      throw cause
    } finally {
      if (renderTasks.get(pageNumber) === pageRenderTask) renderTasks.delete(pageNumber)
      if (renderPromises.get(pageNumber) === renderPromise) renderPromises.delete(pageNumber)
    }
  })()

  renderPromises.set(pageNumber, renderPromise)
  await renderPromise
}

async function renderNearbyPages(index: number) {
  const step = getPageStep(index)
  const start = Math.max(hasCover.value ? 1 : 0, index - 1)
  const end = Math.min(pageCount.value, index + step + 2)
  await Promise.all(Array.from({ length: end - start }, (_, offset) => {
    const pageNumber = getPdfPageNumber(start + offset)
    return pageNumber > 0 ? renderPdfPage(pageNumber) : Promise.resolve()
  }))
}

function teardownFlipbook() {
  pageFlip.value?.destroy()
  pageFlip.value = undefined
  orientation.value = 'landscape'
  bookGeneration.value++
}

async function initializeFlipbook(request: number) {
  const root = bookElement.value
  if (!root || !pageCount.value) return
  const { PageFlip: PageFlipConstructor } = await import('page-flip')
  if (request !== requestNumber || root !== bookElement.value) return

  const instance = new PageFlipConstructor(root, {
    width: 360,
    height: 509,
    size: 'stretch',
    minWidth: 200,
    maxWidth: 480,
    minHeight: 220,
    maxHeight: 760,
    drawShadow: true,
    flippingTime: 1050,
    usePortrait: false,
    startPage: 0,
    autoSize: true,
    maxShadowOpacity: 0.32,
    showCover: true,
    mobileScrollSupport: false,
    useMouseEvents: true,
    showPageCorners: true,
    backgroundColor: '#f4efe6',
  })
  instance.loadFromHTML(root.querySelectorAll<HTMLElement>('.flipbook-page'))
  instance.on('flip', (event) => {
    currentPageIndex.value = event.data
    void renderNearbyPages(event.data).catch((cause: unknown) => {
      console.error('Gagal merender halaman PDF.', cause)
      error.value = getBookLoadError(cause)
    })
  })
  pageFlip.value = instance
  orientation.value = instance.getOrientation()
  instance.on('changeOrientation', (event) => {
    orientation.value = event.data
  })
  currentPageIndex.value = instance.getCurrentPageIndex()
  await nextTick()
  await renderNearbyPages(currentPageIndex.value)
}

function getBookLoadError(cause: unknown) {
  if (!(cause instanceof Error)) {
    return 'Buku gagal dibuka. Pastikan file PDF tersedia dan coba unggah ulang melalui Kelola Buku.'
  }

  const message = cause.message.toLocaleLowerCase('id')
  if (message.includes('invalid pdf') || message.includes('missing pdf') || message.includes('unexpected eof')) {
    return 'File PDF rusak atau formatnya tidak valid. Coba buka file di pembaca PDF lain lalu unggah ulang.'
  }
  if (message.includes('worker') || message.includes('fake worker')) {
    return 'Komponen pembaca PDF gagal dimuat. Muat ulang halaman; jika masih terjadi, periksa koneksi dan instalasi aplikasi.'
  }
  if (message.includes('failed to fetch') || message.includes('network')) {
    return 'File PDF tidak dapat dimuat dari penyimpanan browser. Coba unggah ulang file melalui Kelola Buku.'
  }
  if (message.includes('canvas')) {
    return `Canvas halaman PDF tidak tersedia. Muat ulang halaman; jika masih terjadi, unggah ulang file PDF. (${cause.message})`
  }
  if (message.includes('password') || message.includes('encrypted')) {
    return 'PDF ini dilindungi kata sandi dan tidak dapat dibuka di pembaca buku.'
  }

  return `Buku gagal dibuka: ${cause.message}`
}

async function loadBook() {
  const request = ++requestNumber
  teardownFlipbook()
  renderTasks.forEach(task => task.cancel())
  renderTasks.clear()
  renderPromises.clear()
  renderedPages.clear()
  pageCanvases.clear()
  await loadingTaskRef.value?.destroy()
  loadingTaskRef.value = undefined
  documentRef.value = undefined
  pdfPageCount.value = 0
  currentPageIndex.value = 0
  error.value = ''
  loading.value = true

  try {
    if (props.source) {
      const pdfjs = await import('pdfjs-dist')
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
      const response = await fetch(props.source)
      if (!response.ok) throw new Error('PDF tidak dapat dibaca.')
      if (request !== requestNumber) return
      const loadingTask = pdfjs.getDocument({ data: await response.arrayBuffer() })
      loadingTaskRef.value = loadingTask
      const pdf = await loadingTask.promise
      if (request !== requestNumber) {
        await loadingTask.destroy()
        return
      }
      documentRef.value = pdf
      pdfPageCount.value = pdf.numPages
    } else {
      pdfPageCount.value = 0
    }

    if (!pageCount.value) return
    loading.value = false
    await nextTick()
    await initializeFlipbook(request)
  } catch (cause) {
    if (request !== requestNumber) return
    console.error('Gagal memuat buku digital.', cause)
    error.value = getBookLoadError(cause)
  } finally {
    if (request === requestNumber) loading.value = false
  }
}

async function turnPage(direction: 'next' | 'previous') {
  const instance = pageFlip.value
  if (!instance || loading.value) return
  const step = direction === 'next'
    ? getPageStep(currentPageIndex.value)
    : isPortrait.value || (hasCover.value && currentPageIndex.value === 1) ? 1 : 2
  const target = currentPageIndex.value + (direction === 'next' ? step : -step)
  if (target < 0 || target >= pageCount.value) return

  try {
    const firstPdfPage = getPdfPageNumber(target)
    const pagesToRender = Array.from({ length: Math.min(step, pageCount.value - target) }, (_, offset) => firstPdfPage + offset)
      .filter(pageNumber => pageNumber > 0)
    await Promise.all(pagesToRender.map(renderPdfPage))
    if (direction === 'next') instance.flipNext()
    else instance.flipPrev()
  } catch (cause) {
    console.error('Gagal menampilkan halaman PDF berikutnya.', cause)
    error.value = getBookLoadError(cause)
  }
}

function changeZoom(amount: number) {
  zoom.value = Math.min(150, Math.max(70, zoom.value + amount))
}

async function toggleFullscreen() {
  if (!import.meta.client) return
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await document.documentElement.requestFullscreen()
  } catch (cause) {
    console.error('Mode layar penuh tidak dapat diaktifkan.', cause)
    error.value = 'Mode layar penuh tidak tersedia di browser ini.'
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    if (document.fullscreenElement) return
    const target = event.target
    if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return
    event.preventDefault()
    void navigateTo(bookDetailRoute.value)
  }
  if (event.key === 'ArrowRight') void turnPage('next')
  if (event.key === 'ArrowLeft') void turnPage('previous')
}

watch(() => [props.source, props.pages], () => { void loadBook() }, { deep: true, flush: 'post' })

onMounted(() => {
  void loadBook()
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  requestNumber++
  window.removeEventListener('keydown', handleKeydown)
  teardownFlipbook()
  renderTasks.forEach(task => task.cancel())
  renderTasks.clear()
  void loadingTaskRef.value?.destroy()
})
</script>

<template>
  <main class="reader-page min-h-dvh bg-gray-950 text-gray-100 antialiased">
    <header class="reader-toolbar">
      <div class="reader-toolbar__inner">
        <div class="reader-book-meta">
          <NuxtLink :to="bookDetailRoute" class="reader-back" aria-label="Kembali ke detail buku">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
            <path d="M10 6 4 12l6 6M4.5 12H14a5 5 0 0 1 5 5v1" />
            </svg>
            <span>Detail Buku</span>
          </NuxtLink>
          <div class="reader-book-meta__copy">
            <strong :title="title">{{ title }}</strong>
            <span>{{ [author, category].filter(Boolean).join(' · ') }}<span v-if="category" class="reader-digital-tag">Buku Digital (PDF)</span></span>
          </div>
        </div>
        <div class="reader-tools" aria-label="Kontrol pembaca">
          <a v-if="source" :href="source" :download="`${title}.pdf`" class="reader-tool reader-download" aria-label="Unduh PDF" title="Unduh PDF">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 17v3h14v-3" /></svg>
          </a>
          <NuxtLink to="/favorit" aria-label="Buku favorit" class="reader-tool reader-favorite" title="Buku favorit">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1 7.8 7.7 7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8Z" /></svg>
          </NuxtLink>
          <div class="reader-zoom" aria-label="Perbesar atau perkecil halaman">
            <button type="button" class="reader-tool" aria-label="Perkecil halaman" :disabled="zoom <= 70" @click="changeZoom(-10)">−</button>
            <span>{{ zoom }}%</span>
            <button type="button" class="reader-tool" aria-label="Perbesar halaman" :disabled="zoom >= 150" @click="changeZoom(10)">+</button>
          </div>
          <button type="button" class="reader-tool reader-fullscreen" aria-label="Aktifkan layar penuh" title="Layar penuh" @click="toggleFullscreen">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4" /></svg>
          </button>
        </div>
      </div>
    </header>

    <section class="reader-layout">
      <div class="reader-stage" :class="{ 'reader-stage--portrait': isPortrait }">
        <div v-if="loading" class="reader-message" role="status">
          <span class="reader-spinner" aria-hidden="true" />
          Memuat halaman buku…
        </div>
        <div v-else-if="error" class="reader-message reader-message--error" role="alert">
          {{ error }}
        </div>
        <div v-else-if="!pageCount" class="reader-message reader-message--empty">
          <span aria-hidden="true">▤</span>
          <h2>File PDF belum tersedia</h2>
          <p>Tambahkan file PDF buku ini melalui halaman Kelola Buku.</p>
          <NuxtLink to="/admin/kelola-buku">Buka Kelola Buku</NuxtLink>
        </div>

        <template v-else>
          <button type="button" class="reader-side-button reader-side-button--previous" :disabled="!canGoPrevious" aria-label="Halaman sebelumnya" @click="turnPage('previous')">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <div class="reader-book-stage">
            <div :key="bookGeneration" ref="bookElement" class="flipbook-root" :style="bookStyle">
              <article
                v-for="bookPageIndex in bookPages"
                :key="bookPageIndex"
                class="flipbook-page"
                :class="{ 'flipbook-cover-page': hasCover && bookPageIndex === 0 }"
                :aria-label="hasCover && bookPageIndex === 0 ? 'Sampul buku' : `Halaman ${getPdfPageNumber(bookPageIndex)}`"
              >
                <template v-if="hasCover && bookPageIndex === 0">
                  <img v-if="cover && !coverImageError" class="flipbook-cover-image" :src="cover" :alt="`Sampul ${title}`" @error="coverImageError = true" />
                  <div v-else class="flipbook-cover-placeholder">
                    <span>PERPUSTAKAAN DIGITAL</span>
                    <strong>{{ title }}</strong>
                    <small>{{ author }}</small>
                  </div>
                </template>
                <canvas v-else-if="source" :ref="element => setCanvasRef(bookPageIndex, element as HTMLCanvasElement | null)" class="flipbook-page-canvas" />
                <div v-else class="flipbook-text-content">
                  <span class="flipbook-page-number">{{ bookPageIndex + 1 }}</span>
                  <p>{{ pages[bookPageIndex] }}</p>
                </div>
              </article>
            </div>
          </div>
          <button type="button" class="reader-side-button reader-side-button--next" :disabled="!canGoNext" aria-label="Halaman selanjutnya" @click="turnPage('next')">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </template>
      </div>
      <footer v-if="pageCount && !loading && !error" class="reader-controls">
        <nav class="reader-pagination" aria-label="Navigasi halaman buku">
          <button type="button" :disabled="!canGoPrevious" class="reader-nav-button" aria-label="Halaman sebelumnya" @click="turnPage('previous')">
            <span aria-hidden="true">←</span><span class="reader-button-label">Sebelumnya</span>
          </button>
          <div class="reader-progress-area">
            <div class="reader-page-status"><span>Halaman</span><strong>{{ pageRange }}</strong><span class="reader-progress-percent">{{ progress }}%</span></div>
            <div class="reader-progress" role="progressbar" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100" :aria-label="`Progres membaca ${progress}%`">
              <span :style="{ width: `${progress}%` }" />
            </div>
            <p class="reader-hint">Gunakan tombol <kbd>←</kbd> <kbd>→</kbd> pada keyboard untuk membalik halaman</p>
          </div>
          <button type="button" :disabled="!canGoNext" class="reader-nav-button" aria-label="Halaman selanjutnya" @click="turnPage('next')">
            <span class="reader-button-label">Selanjutnya</span><span aria-hidden="true">→</span>
          </button>
        </nav>
      </footer>
    </section>
  </main>
</template>

<style scoped>
.reader-page,
.reader-page *,
.reader-page *::before,
.reader-page *::after { box-sizing: border-box; }
.reader-page {
  display: grid;
  grid-template-rows: 48px minmax(0, 1fr);
  width: 100%;
  height: 100dvh;
  min-height: 420px;
  overflow: hidden;
  background: #080b12;
  color: #e5e7eb;
}
.reader-toolbar {
  z-index: 5;
  min-width: 0;
  border-bottom: 1px solid rgb(255 255 255 / 7%);
  background: #0b0f17;
}
.reader-toolbar__inner {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-inline: clamp(0.75rem, 2.5vw, 2.5rem);
}
.reader-book-meta,
.reader-tools,
.reader-back,
.reader-zoom { display: flex; align-items: center; }
.reader-book-meta { min-width: 0; gap: clamp(0.6rem, 1.4vw, 1.25rem); }
.reader-back {
  flex: 0 0 auto;
  gap: 0.4rem;
  color: #fb7185;
  font-size: 0.68rem;
  font-weight: 600;
  text-decoration: none;
}
.reader-back svg {
  width: 1rem;
  height: 1rem;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}
.reader-book-meta__copy { display: grid; min-width: 0; gap: 0.12rem; }
.reader-book-meta__copy strong {
  overflow: hidden;
  color: #f3f4f6;
  font-size: clamp(0.68rem, 1.05vw, 0.82rem);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.reader-book-meta__copy > span {
  overflow: hidden;
  color: #9ca3af;
  font-size: 0.58rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.reader-digital-tag { margin-left: 0.4rem; color: #6ee7b7; }
.reader-tools { flex: 0 0 auto; gap: 0.35rem; }
.reader-tool {
  display: inline-flex;
  width: 1.9rem;
  height: 1.9rem;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 0.45rem;
  background: transparent;
  color: #d1d5db;
  cursor: pointer;
  text-decoration: none;
  transition: background-color 150ms ease, color 150ms ease;
}
.reader-tool:hover:not(:disabled) { background: rgb(255 255 255 / 9%); color: #fff; }
.reader-tool:disabled { cursor: not-allowed; opacity: 0.4; }
.reader-tool:focus-visible,
.reader-back:focus-visible,
.reader-nav-button:focus-visible,
.reader-side-button:focus-visible { outline: 2px solid #fb7185; outline-offset: 2px; }
.reader-tool svg { width: 1rem; height: 1rem; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.6; }
.reader-favorite svg { fill: none; }
.reader-zoom {
  height: 1.9rem;
  gap: 0.1rem;
  padding-inline: 0.25rem;
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 0.55rem;
  background: #111827;
  color: #d1d5db;
  font-size: 0.62rem;
}
.reader-zoom .reader-tool { width: 1.55rem; height: 1.55rem; font-size: 0.95rem; }
.reader-layout {
  display: grid;
  grid-template-rows: minmax(0, 1fr) 76px;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
.reader-stage {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  touch-action: pan-y;
  background: #080b12;
}
.reader-book-stage { display: grid; width: 100%; height: 100%; min-height: 0; place-items: center; }
.flipbook-root {
  width: min(100%, 960px, calc((100dvh - 185px) * 1.414)) !important;
  height: auto;
  max-height: 100%;
  aspect-ratio: 720 / 509;
  min-height: 0;
  margin: auto;
  transform: scale(var(--reader-zoom, 1)) translateZ(0);
  transform-origin: center;
  will-change: transform;
}
.reader-stage--portrait .flipbook-root {
  width: min(100%, 480px, calc((100dvh - 185px) * 0.707)) !important;
  aspect-ratio: 360 / 509;
}
.flipbook-page {
  display: flex;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid #ddd7cb;
  background: #fbfaf6;
  color: #26231f;
  box-shadow: inset 0 0 28px rgb(83 67 44 / 5%);
  transform: translateZ(0);
  will-change: transform;
}
.flipbook-page-canvas {
  display: block;
  flex: 0 1 auto;
  object-fit: contain;
  transform: translateZ(0);
  will-change: transform;
}
.flipbook-cover-page {
  position: relative;
  overflow: hidden;
  border-color: #252a34;
  background: radial-gradient(ellipse at 50% 20%, #3b4657, #18202c 58%, #0c1119);
  color: #fff;
}
.flipbook-cover-image { width: 100%; height: 100%; object-fit: cover; }
.flipbook-cover-placeholder {
  display: grid;
  width: 100%;
  height: 100%;
  align-content: end;
  gap: 0.8rem;
  padding: clamp(1.5rem, 5vw, 3rem);
  background: linear-gradient(180deg, transparent 28%, rgb(0 0 0 / 72%));
  text-align: center;
}
.flipbook-cover-placeholder span { color: #fda4af; font-size: 0.58rem; font-weight: 700; letter-spacing: 0.18em; }
.flipbook-cover-placeholder strong { font-size: clamp(1.4rem, 4vw, 2.3rem); line-height: 1.2; overflow-wrap: anywhere; }
.flipbook-cover-placeholder small { color: rgb(255 255 255 / 75%); font-size: 0.8rem; }
.flipbook-text-content {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: auto;
  padding: clamp(1.25rem, 4vw, 3rem);
  color: #27231f;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(0.95rem, 1.3vw, 1.1rem);
  line-height: 1.8;
  white-space: pre-wrap;
}
.flipbook-text-content p { color: #27231f; }
.flipbook-page-number {
  display: block;
  margin-bottom: 1.25rem;
  color: #887d6e;
  font-family: sans-serif;
  font-size: 0.72rem;
  text-align: center;
}
.reader-side-button {
  position: absolute;
  z-index: 2;
  top: 50%;
  display: grid;
  width: 2.65rem;
  height: 2.65rem;
  place-items: center;
  transform: translateY(-50%);
  border: 1px solid rgb(255 255 255 / 5%);
  border-radius: 50%;
  background: #111827;
  color: #d1d5db;
  cursor: pointer;
  transition: background-color 150ms ease, color 150ms ease, opacity 150ms ease;
}
.reader-side-button:hover:not(:disabled) { background: #1f2937; color: #fff; }
.reader-side-button:disabled { cursor: not-allowed; opacity: 0.35; }
.reader-side-button svg { width: 1.25rem; height: 1.25rem; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.8; }
.reader-side-button--previous { left: clamp(0.75rem, 2.4vw, 2.25rem); }
.reader-side-button--next { right: clamp(0.75rem, 2.4vw, 2.25rem); }
.reader-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  padding: 0.55rem clamp(0.8rem, 4vw, 4rem) 0.35rem;
  border-top: 1px solid rgb(255 255 255 / 6%);
  background: #0b0f17;
}
.reader-pagination {
  display: grid;
  width: min(100%, 760px);
  grid-template-columns: minmax(6rem, 1fr) minmax(0, 2.5fr) minmax(6rem, 1fr);
  align-items: start;
  gap: clamp(0.75rem, 3vw, 2rem);
}
.reader-nav-button {
  display: inline-flex;
  min-height: 2rem;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  margin-top: 0.1rem;
  padding: 0.35rem 0.65rem;
  border: 1px solid rgb(255 255 255 / 5%);
  border-radius: 0.45rem;
  background: #1f2937;
  color: #e5e7eb;
  cursor: pointer;
  font-size: 0.65rem;
  font-weight: 600;
  transition: background-color 150ms ease, color 150ms ease;
}
.reader-nav-button:hover:not(:disabled) { background: #374151; color: #fff; }
.reader-nav-button:disabled { cursor: not-allowed; opacity: 0.42; }
.reader-progress-area { min-width: 0; }
.reader-page-status { display: flex; align-items: center; justify-content: center; gap: 0.55rem; color: #9ca3af; font-size: 0.58rem; }
.reader-page-status strong { color: #e5e7eb; font-weight: 600; }
.reader-progress-percent { color: #9ca3af; }
.reader-progress { width: 100%; height: 0.28rem; margin-top: 0.4rem; overflow: hidden; border-radius: 999px; background: #253041; }
.reader-progress span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #f43f5e, #fb7185); transition: width 500ms ease-out; }
.reader-hint { margin: 0.3rem 0 0; color: #6b7280; font-size: 0.52rem; text-align: center; }
.reader-hint kbd { padding-inline: 0.2rem; color: #9ca3af; }
.reader-message {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  padding: 1.5rem;
  color: #d1d5db;
  font-size: 0.9rem;
  text-align: center;
}
.reader-message--error { color: #fecdd3; }
.reader-message--empty { max-width: 32rem; margin: auto; color: #9ca3af; }
.reader-message--empty > span { color: #fb7185; font-size: 2.5rem; }
.reader-message--empty h2 { margin: 0; color: #f9fafb; font-size: 1.1rem; }
.reader-message--empty p { margin: 0; color: #9ca3af; font-size: 0.85rem; }
.reader-message--empty a { padding: 0.6rem 0.9rem; border-radius: 0.5rem; background: #e11d48; color: #fff; font-size: 0.8rem; font-weight: 600; text-decoration: none; }
.reader-spinner {
  width: 34px;
  height: 34px;
  border: 3px solid #4b5563;
  border-top-color: #f43f5e;
  border-radius: 50%;
  animation: spin 750ms linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 640px) {
  .reader-page { grid-template-rows: 52px minmax(0, 1fr); }
  .reader-toolbar__inner { gap: 0.35rem; padding-inline: 0.55rem; }
  .reader-book-meta { gap: 0.45rem; }
  .reader-back { gap: 0; }
  .reader-back span { display: none; }
  .reader-back svg { width: 1.2rem; height: 1.2rem; }
  .reader-book-meta__copy > span { max-width: 45vw; font-size: 0.52rem; }
  .reader-digital-tag { display: none; }
  .reader-tools { gap: 0.1rem; }
  .reader-tool { width: 1.65rem; height: 1.65rem; }
  .reader-zoom { height: 1.7rem; }
  .reader-zoom .reader-tool { width: 1.3rem; height: 1.3rem; }
  .reader-layout { grid-template-rows: minmax(0, 1fr) 73px; }
  .reader-side-button { width: 2rem; height: 2rem; }
  .reader-side-button--previous { left: 0.35rem; }
  .reader-side-button--next { right: 0.35rem; }
  .flipbook-root { width: min(100%, 960px, calc((100dvh - 168px) * 1.414)) !important; }
  .reader-stage--portrait .flipbook-root { width: min(100%, 480px, calc((100dvh - 168px) * 0.707)) !important; }
  .reader-controls { padding: 0.45rem 0.55rem 0.25rem; }
  .reader-pagination { grid-template-columns: 2.2rem minmax(0, 1fr) 2.2rem; gap: 0.35rem; }
  .reader-nav-button { min-width: 2rem; min-height: 2rem; padding-inline: 0.35rem; }
  .reader-button-label { display: none; }
  .reader-hint { font-size: 0.47rem; }
}
@media (max-width: 380px) {
  .reader-download,
  .reader-favorite { display: none; }
  .reader-book-meta__copy strong { max-width: 38vw; }
  .reader-page-status { gap: 0.3rem; font-size: 0.52rem; }
}
@media (max-height: 560px) and (orientation: landscape) {
  .reader-page { grid-template-rows: 42px minmax(0, 1fr); }
  .reader-layout { grid-template-rows: minmax(0, 1fr) 48px; }
  .reader-controls { padding-block: 0.2rem; }
  .reader-hint { display: none; }
  .flipbook-root { width: min(100%, 960px, calc((100dvh - 120px) * 1.414)) !important; }
  .reader-stage--portrait .flipbook-root { width: min(100%, 480px, calc((100dvh - 120px) * 0.707)) !important; }
}
@media (prefers-reduced-motion: reduce) {
  .reader-page *,
  .reader-page *::before,
  .reader-page *::after { scroll-behavior: auto !important; animation-duration: 1ms !important; transition-duration: 1ms !important; }
}
</style>
