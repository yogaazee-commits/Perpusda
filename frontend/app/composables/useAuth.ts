import { apiFetch } from './useApi'

export interface AuthUser {
  id: string
  name: string
  email: string
  roles: string[]
}

interface AuthSession {
  token: string
  user: AuthUser
}

interface AuthResponse {
  success: boolean
  error?: string
  token?: string
  user?: {
    id: string
    nama: string
    email: string
    roles: string[]
  }
}

const SESSION_KEY = 'pdk-local-session'
const NOTICE_KEY = 'pdk-auth-notice'

function readSession(): AuthSession | null {
  if (!import.meta.client) return null
  try {
    const value: unknown = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
    if (!value || typeof value !== 'object' || !('token' in value) || typeof value.token !== 'string'
      || !('user' in value) || !value.user || typeof value.user !== 'object') {
      return null
    }
    const user = value.user
    if (!('id' in user) || typeof user.id !== 'string' || !('name' in user) || typeof user.name !== 'string'
      || !('email' in user) || typeof user.email !== 'string' || !('roles' in user)
      || !Array.isArray(user.roles) || !user.roles.every(role => typeof role === 'string')) {
      return null
    }
    return { token: value.token, user: { id: user.id, name: user.name, email: user.email, roles: user.roles } }
  } catch (error) {
    console.error('Gagal membaca sesi masuk.', error)
    return null
  }
}

export function getStoredAuthUser(): AuthUser | null {
  return readSession()?.user ?? null
}

export function hasStoredAuthSession() {
  return readSession() !== null
}

export function setStoredAuthNotice(message: string) {
  if (!import.meta.client) return
  useState('local-auth-notice', () => '').value = message
  try {
    localStorage.setItem(NOTICE_KEY, message)
  } catch (error) {
    console.error('Notifikasi autentikasi tidak dapat disimpan.', error)
  }
}

function normalizeAuthResponse(response: AuthResponse): AuthSession {
  if (!response.success || !response.token || !response.user) {
    throw new Error(response.error || 'Server tidak mengembalikan sesi autentikasi yang valid.')
  }
  return {
    token: response.token,
    user: {
      id: response.user.id,
      name: response.user.nama,
      email: response.user.email,
      roles: response.user.roles,
    },
  }
}

export function useAuth() {
  const currentUser = useState<AuthUser | null>('local-auth-user', () => null)
  const authNotice = useState('local-auth-notice', () => '')

  onMounted(() => {
    currentUser.value = getStoredAuthUser()
  })

  async function login(identity: string, password: string) {
    try {
      const response = await apiFetch<AuthResponse>('/login', {
        method: 'POST',
        body: { email: identity.trim(), password },
      })
      const session = normalizeAuthResponse(response)
      localStorage.setItem(SESSION_KEY, JSON.stringify(session))
      currentUser.value = session.user
      return { ok: true as const }
    } catch (error) {
      console.error('Gagal masuk ke akun backend.', error)
      return { ok: false as const, error: error instanceof Error ? error.message : 'Tidak dapat masuk. Silakan coba lagi.' }
    }
  }

  async function register(name: string, email: string, password: string) {
    try {
      await apiFetch<AuthResponse>('/register', {
        method: 'POST',
        body: { nama: name.trim(), email: email.trim(), password },
      })
      return await login(email, password)
    } catch (error) {
      console.error('Gagal membuat akun backend.', error)
      return { ok: false as const, error: error instanceof Error ? error.message : 'Akun tidak dapat dibuat. Silakan coba lagi.' }
    }
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY)
    currentUser.value = null
  }

  function setNotice(message: string) {
    authNotice.value = message
    setStoredAuthNotice(message)
  }

  function consumeNotice() {
    const message = authNotice.value || (import.meta.client ? localStorage.getItem(NOTICE_KEY) || '' : '')
    authNotice.value = ''
    if (import.meta.client) localStorage.removeItem(NOTICE_KEY)
    return message
  }

  return { currentUser, authNotice, register, login, logout, setNotice, consumeNotice }
}
