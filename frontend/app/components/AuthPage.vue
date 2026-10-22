<script setup lang="ts">
const props = defineProps<{ mode?: 'login' | 'register' | 'reset' }>()
const route = useRoute()
const mode = computed(() => props.mode ?? (route.path.includes('daftar') ? 'register' : route.path.includes('lupa-sandi') ? 'reset' : 'login'))
const email = ref('')
const name = ref('')
const password = ref('')
const passwordVisible = ref(false)
const remember = ref(false)
const submitted = ref(false)
const error = ref('')
const authNotice = ref('')
const { register, login, consumeNotice } = useAuth()
const redirectPath = computed(() => {
  const requested = route.query.redirect
  return typeof requested === 'string' && requested.startsWith('/') && !requested.startsWith('//')
    ? requested
    : '/'
})
const pageTitle = computed(() => mode.value === 'register' ? 'Buat akun baru' : mode.value === 'reset' ? 'Atur ulang kata sandi' : 'Masuk ke akun Anda')
const subtitle = computed(() => mode.value === 'register' ? 'Bergabung dan jelajahi koleksi digital Karanganyar.' : mode.value === 'reset' ? 'Pemulihan kata sandi otomatis belum tersedia. Hubungi administrator perpustakaan untuk bantuan.' : '')

onMounted(() => {
  authNotice.value = consumeNotice() || (route.query.authRequired === '1'
    ? 'Silakan masuk atau buat akun terlebih dahulu untuk mengakses fitur ini.'
    : '')
  const saved = localStorage.getItem('pdk-theme')
  const theme = saved === 'dark' || saved === 'light'
    ? saved
    : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  document.documentElement.dataset.theme = theme
})

watch(mode, () => { submitted.value = false; error.value = '' })
useHead(() => ({ title: `${pageTitle.value} · Perpustakaan Digital Karanganyar` }))

async function submitForm() {
  error.value = ''
  if (!email.value.trim()) error.value = 'Nama pengguna atau email wajib diisi.'
  else if (mode.value === 'register' && name.value.trim().length < 2) error.value = 'Nama lengkap minimal 2 karakter.'
  else if (mode.value !== 'reset' && password.value.length < 6) error.value = 'Kata sandi minimal 6 karakter.'
  else if (email.value.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) error.value = 'Format alamat email tidak valid.'
  else if (mode.value === 'reset') error.value = 'Pemulihan kata sandi belum tersedia. Silakan hubungi administrator perpustakaan.'
  else {
    const result = mode.value === 'register'
      ? await register(name.value, email.value, password.value)
      : await login(email.value, password.value)
    if (result.ok) submitted.value = true
    else error.value = result.error
  }
}

</script>

<template>
  <main class="auth-page">
    <section class="login-card" :aria-labelledby="'auth-title'">
      <NuxtLink to="/" class="auth-home-link" aria-label="Beranda">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M19 12H5m7 7-7-7 7-7"/></svg>
      </NuxtLink>
      <div v-if="submitted" class="login-body auth-success">
        <span class="success-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12 4 4L19 6"/></svg></span>
        <h1 id="auth-title" class="success-title">{{ mode === 'reset' ? 'Periksa email Anda' : mode === 'register' ? 'Akun berhasil dibuat' : 'Berhasil masuk' }}</h1>
        <p class="success-desc">{{ mode === 'reset' ? 'Jika email terdaftar, tautan pemulihan akan segera dikirim.' : `Selamat datang${name ? `, ${name}` : ''} di Perpustakaan Digital Karanganyar.` }}</p>
        <NuxtLink :to="mode === 'reset' ? '/' : redirectPath" class="btn btn--primary">{{ mode === 'reset' ? 'Kembali ke beranda' : 'Lanjutkan' }}</NuxtLink>
      </div>
      <div v-else class="login-body">
        <p class="auth-mark">PERPUSDA KARANGANYAR</p>
        <h1 id="auth-title" class="login-title">{{ pageTitle }}</h1>
        <p v-if="subtitle" class="login-subtitle">{{ subtitle }}</p>
        <p v-if="authNotice" class="auth-notice" role="status">{{ authNotice }}</p>
        <form novalidate @submit.prevent="submitForm">
          <div v-if="mode === 'register'" class="form-group">
            <label class="form-label" for="fullName">Nama lengkap</label>
            <input id="fullName" v-model="name" class="form-input" type="text" autocomplete="name" placeholder="Nama Anda" />
          </div>
          <div class="form-group">
            <label class="form-label" for="authEmail">{{ mode === 'login' ? 'Email atau nama pengguna' : 'Alamat email' }}</label>
            <input id="authEmail" v-model="email" class="form-input" :class="{ 'is-error': error && !email }" type="text" :autocomplete="mode === 'login' ? 'username' : 'email'" placeholder="nama@email.com" />
          </div>
          <div v-if="mode !== 'reset'" class="form-group">
            <label class="form-label" for="authPassword">Kata sandi</label>
            <div class="pwd-wrapper"><input id="authPassword" v-model="password" class="form-input" :class="{ 'is-error': error && password.length < 6 }" :type="passwordVisible ? 'text' : 'password'" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" placeholder="Minimal 6 karakter" /><button class="pwd-toggle" type="button" :aria-label="passwordVisible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'" @click="passwordVisible = !passwordVisible"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></button></div>
          </div>
          <p v-if="error" class="form-error auth-error" role="alert">{{ error }}</p>
          <div v-if="mode === 'login'" class="login-meta"><label class="remember-label"><input v-model="remember" type="checkbox" />Ingat saya</label><NuxtLink to="/lupa-sandi" class="forgot-link">Lupa Kata Sandi?</NuxtLink></div>
          <button class="btn-submit" type="submit" :disabled="mode === 'reset'">{{ mode === 'reset' ? 'Pemulihan Belum Tersedia' : mode === 'register' ? 'Buat Akun' : 'Masuk' }}</button>
        </form>
      </div>
      <footer v-if="!submitted" class="login-footer">
        <template v-if="mode === 'login'">Pengguna baru? <NuxtLink :to="{ path: '/daftar', query: route.query.redirect ? { redirect: redirectPath } : {} }">Daftar</NuxtLink></template>
        <template v-else-if="mode === 'register'">Sudah punya akun? <NuxtLink :to="{ path: '/masuk', query: route.query.redirect ? { redirect: redirectPath } : {} }">Masuk</NuxtLink></template>
        <template v-else>Ingat kata sandi? <NuxtLink to="/masuk">Masuk</NuxtLink></template>
      </footer>
    </section>
    <p class="auth-copyright">© 2026 Perpustakaan Digital Kabupaten Karanganyar</p>
  </main>
</template>

<style scoped>
.auth-page { display: flex; min-height: 100dvh; flex-direction: column; align-items: center; justify-content: center; padding: 1.5rem 1rem; }
.login-card { position: relative; }
.auth-home-link { position: absolute; top: 1rem; left: 1rem; display: grid; width: 2rem; height: 2rem; place-items: center; border-radius: var(--radius-pill); color: var(--color-text-muted); transition: color var(--transition-fast), background var(--transition-fast); }
.auth-home-link:hover { color: var(--color-accent); background: var(--color-border); }
.auth-mark { margin-bottom: 0.75rem; color: var(--color-accent); font-size: 0.68rem; font-weight: 700; letter-spacing: 0.1em; text-align: center; }
.auth-error { display: flex; margin: -0.3rem 0 0.8rem; }
.auth-notice { margin: 0 0 1rem; padding: 0.75rem 0.9rem; border: 1px solid var(--color-accent); border-radius: var(--radius-sm); color: var(--color-text); font-size: 0.85rem; }
.auth-success { display: flex; min-height: 290px; flex-direction: column; align-items: center; justify-content: center; gap: 0.85rem; text-align: center; }
.auth-success .success-desc { max-width: 330px; margin-bottom: 0.5rem; }
.auth-copyright { margin-top: 1.4rem; color: var(--color-text-muted); font-size: 0.73rem; }
</style>