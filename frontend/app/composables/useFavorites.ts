import { getStoredAuthUser, hasStoredAuthSession, useAuth } from './useAuth'

export function useFavorites() {
  const ids = useState<(number | string)[]>('favorite-book-ids', () => [])
  const ready = useState('favorite-book-ids-ready', () => false)
  const route = useRoute()
  const { currentUser, setNotice } = useAuth()

  function readIds(email?: string) {
    if (!email) {
      ids.value = []
      return
    }
    const key = `favorite-book-ids:${email}`
    const stored = localStorage.getItem(key)
    if (stored === null) {
      const oldFavorites = localStorage.getItem('favorite-book-ids')
      if (oldFavorites) {
        localStorage.setItem(key, oldFavorites)
        localStorage.removeItem('favorite-book-ids')
      }
      ids.value = oldFavorites ? JSON.parse(oldFavorites) as (number | string)[] : []
      return
    }
    ids.value = JSON.parse(stored) as (number | string)[]
  }

  onMounted(() => {
    if (ready.value) return
    try {
      const user = getStoredAuthUser()
      readIds(user?.email)
    } catch (error) {
      console.error('Gagal membaca daftar buku favorit.', error)
      ids.value = []
    }
    ready.value = true
  })

  watch(() => currentUser.value?.email, (email) => {
    if (!ready.value) return
    try {
      readIds(email)
    } catch (error) {
      console.error('Gagal membaca daftar buku favorit akun ini.', error)
      ids.value = []
    }
  })

  function toggle(id: number | string) {
    if (!hasStoredAuthSession()) {
      setNotice('Silakan masuk atau buat akun terlebih dahulu untuk menyimpan buku favorit.')
      void navigateTo({ path: '/masuk', query: { redirect: route.fullPath } })
      return false
    }

    ids.value = ids.value.includes(id) ? ids.value.filter(item => item !== id) : [...ids.value, id]
    const user = getStoredAuthUser()
    if (!user) return false
    try {
      localStorage.setItem(`favorite-book-ids:${user.email}`, JSON.stringify(ids.value))
      return true
    } catch (error) {
      console.error('Gagal menyimpan daftar buku favorit.', error)
      setNotice('Buku favorit tidak dapat disimpan di penyimpanan browser.')
      return false
    }
  }

  return { ids, toggle }
}