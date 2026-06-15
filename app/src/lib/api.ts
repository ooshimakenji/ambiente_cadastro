// Cliente fetch do backend. Injeta Authorization: Bearer e, em 401, dispara logout.
// Base URL via proxy do Vite (/api → http://localhost:3001) — ver vite.config.ts.

const BASE = '/api'

let token: string | null = null
let onUnauthorized: (() => void) | null = null

export function setToken(t: string | null) {
  token = t
}
export function setOnUnauthorized(fn: () => void) {
  onUnauthorized = fn
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    onUnauthorized?.()
    throw new ApiError(401, 'Sessão expirada')
  }

  if (!res.ok) {
    let msg = `Erro ${res.status}`
    try {
      const data = await res.json()
      if (data?.erro || data?.message) msg = data.erro ?? data.message
    } catch {
      /* corpo não-JSON */
    }
    throw new ApiError(res.status, msg)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
}
