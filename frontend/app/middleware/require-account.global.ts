import { hasStoredAuthSession, setStoredAuthNotice } from '../composables/useAuth'

const ACCOUNT_REQUIRED_PATHS = new Set(['/usulkan-buku', '/sumbangkan-buku', '/favorit'])

export default defineNuxtRouteMiddleware((to) => {
  if (!import.meta.client || useNuxtApp().isHydrating || !ACCOUNT_REQUIRED_PATHS.has(to.path) || hasStoredAuthSession()) return

  setStoredAuthNotice('Silakan masuk atau buat akun terlebih dahulu untuk mengakses fitur ini.')
  return navigateTo({ path: '/masuk', query: { redirect: to.fullPath, authRequired: '1' } })
})
