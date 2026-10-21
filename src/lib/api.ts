const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
const TOKEN_KEY = 'pkm_token'

export type ApiUser = {
  id: number
  name: string
  email: string | null
  phone: string | null
}

export type ApiKey = {
  id: number
  code: string
  description: string
  status: 'available' | 'withdrawn'
}

export type ApiPerson = {
  id: number
  name: string
  phone: string | null
  email: string | null
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

// Chamado quando a API responde 401 com um token salvo (sessão expirada)
let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers })
  } catch {
    throw new ApiError(
      'Sem conexão com o servidor. Confira se o backend está rodando e a VITE_API_URL.',
      0
    )
  }

  if (!response.ok) {
    let detail = ''
    try {
      const body = await response.json()
      if (typeof body.detail === 'string') detail = body.detail
    } catch {
      /* resposta sem JSON */
    }

    if (response.status === 401 && token) onUnauthorized?.()

    throw new ApiError(
      detail || `Erro inesperado do servidor (código ${response.status}).`,
      response.status
    )
  }

  return (response.status === 204 ? undefined : await response.json()) as T
}

export async function login(identifier: string, password: string) {
  const data = await request<{ access_token: string; user: ApiUser }>(
    '/auth/login',
    { method: 'POST', body: JSON.stringify({ identifier, password }) }
  )
  setToken(data.access_token)
  return data.user
}

export const fetchMe = () => request<ApiUser>('/auth/me')
export const fetchKeys = () => request<ApiKey[]>('/keys')
export const fetchPeople = () => request<ApiPerson[]>('/people')
export const createKey = (code: string, description: string) =>
  request<ApiKey>('/keys', {
    method: 'POST',
    body: JSON.stringify({ code, description }),
  })
