<template>
  <div>
    <AppNavbar />

    <main class="container service-page ai-page">
      <header class="ai-header">
        <p class="eyebrow">Baca lebih efisien</p>
        <h1 class="page-heading">Rangkuman Buku</h1>
        <p class="page-intro">Intisari bacaan untuk membantu Anda menemukan gagasan utama sebuah buku.</p>
      </header>

      <section class="ai-unavailable" role="status" aria-labelledby="ai-unavailable-title">
        <span class="ai-unavailable__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
            <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
            <path d="M4 5.5v16M8 7h8M8 10h7" />
          </svg>
        </span>
        <h2 id="ai-unavailable-title">Fitur rangkuman sedang disiapkan</h2>
        <p>
          Rangkuman buku sementara dinonaktifkan selagi layanan backend disiapkan.
          Anda tidak perlu memasukkan API key. Fitur ini akan tersedia kembali setelah integrasi selesai.
        </p>
        <NuxtLink to="/semua-buku" class="btn btn--secondary">Jelajahi koleksi buku</NuxtLink>
      </section>
    </main>

    <AppFooter />
  </div>
</template>

<style scoped>
.ai-page { max-width: 760px; min-height: 68vh; margin-inline: auto; padding-block: clamp(2.5rem, 8vw, 5rem); }
.ai-header { margin-bottom: 2rem; text-align: center; }
.page-heading { margin: 0.35rem 0; font-size: clamp(1.8rem, 4vw, 2.4rem); }
.page-intro { max-width: 580px; margin-inline: auto; color: var(--color-text-muted); font-size: 0.9rem; }
.ai-unavailable { display: grid; justify-items: center; gap: 0.8rem; padding: clamp(1.5rem, 5vw, 3rem); border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: color-mix(in srgb, var(--color-bg) 96%, var(--color-text) 4%); text-align: center; }
.ai-unavailable__icon { display: grid; width: 3.5rem; aspect-ratio: 1; place-items: center; border-radius: var(--radius-pill); background: var(--color-search-focus-ring); color: var(--color-accent); }
.ai-unavailable__icon svg { width: 1.8rem; }
.ai-unavailable h2 { font-size: 1.15rem; }
.ai-unavailable p { max-width: 520px; color: var(--color-text-muted); font-size: 0.88rem; line-height: 1.75; }
.ai-unavailable .btn { margin-top: 0.5rem; }
</style>
