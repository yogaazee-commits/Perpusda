type ApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: Record<string, unknown> | FormData
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}) {
  const config = useRuntimeConfig()
  const headers: Record<string, string> = {}

  if (import.meta.client) {
    try {
      const session: unknown = JSON.parse(localStorage.getItem('pdk-local-session') || 'null')
      if (session && typeof session === 'object' && 'token' in session && typeof session.token === 'string') {
        headers.Authorization = `Bearer ${session.token}`
      }
    } catch (error) {
      console.error('Sesi autentikasi tidak dapat dibaca untuk permintaan API.', error)
    }
  }

  try {
    return await $fetch<T>(path, {
      baseURL: config.public.apiBase,
      ...options,
      headers,
    })
  } catch (error) {
    const payload = error && typeof error === 'object' && 'data' in error
      ? error.data
      : null
    const message = payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
      ? payload.error
      : error instanceof Error ? error.message : 'Permintaan ke server gagal.'
    throw new Error(message)
  }
}
