import type {
  HistoryResponse,
  LoanMetrics,
  PersonHistory,
} from '../features/history/types'

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
  responsible?: string | null
  responsible_id?: number | null
  since?: string | null
  expected_return_at?: string | null
  image_count?: number
}

export type GalleryCategory = 'Fachada' | 'Imóvel' | 'Chave' | 'Documento' | 'Outros'

export type ApiGalleryImage = {
  id: number
  name: string
  description: string | null
  category: GalleryCategory
  key_id: number | null
  key_code: string | null
  key_description: string | null
  mime_type: string
  size_bytes: number
  url: string
  created_at: string
}

export type GalleryImageCreatePayload = {
  name: string
  description: string | null
  category: GalleryCategory
  key_id: number | null
  image_data: string
}

export type ApiPerson = {
  id: number
  name: string
  phone: string | null
  email: string | null
  metrics?: LoanMetrics | null
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
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
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

export const registerUser = (
  name: string,
  email: string,
  phone: string,
  password: string
) =>
  request<ApiUser>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name,
      email: email.trim() || null,
      phone: phone.trim() || null,
      password,
    }),
  })

export const fetchMe = () => request<ApiUser>('/auth/me')
export const fetchKeys = () => request<ApiKey[]>('/keys')
export const fetchHistory = () => request<HistoryResponse>('/movements')
export const fetchPersonHistory = (personId: number) =>
  request<PersonHistory>(`/people/${personId}/history`)
export const fetchPeople = () => request<ApiPerson[]>('/people')
export const createKey = (code: string, description: string) =>
  request<ApiKey>('/keys', {
    method: 'POST',
    body: JSON.stringify({ code, description }),
  })
export const updateKey = (keyId: number, code: string, description: string) =>
  request<ApiKey>(`/keys/${keyId}`, {
    method: 'PUT',
    body: JSON.stringify({ code, description }),
  })
export const deleteKey = (keyId: number) =>
  request<void>(`/keys/${keyId}`, { method: 'DELETE' })
export const withdrawKey = (
  keyId: number,
  responsibleName: string,
  document: string,
  notes: string,
  expectedReturnAt: string | null
) =>
  request<ApiKey>(`/keys/${keyId}/withdraw`, {
    method: 'POST',
    body: JSON.stringify({
      responsible_name: responsibleName,
      document,
      notes,
      expected_return_at: expectedReturnAt,
    }),
  })
export const returnKey = (
  keyId: number,
  responsibleName: string,
  document: string,
  notes: string
) =>
  request<ApiKey>(`/keys/${keyId}/return`, {
    method: 'POST',
    body: JSON.stringify({ responsible_name: responsibleName, document: document || null, notes }),
  })


export type AiPrediction = {
  risk: 'high' | 'low'
  probability: number
  probability_percent: number
  threshold_minutes: number
  threshold_hours: number
  model: string
  disclaimer: string
}

export const predictWithdrawalRisk = (keyId: number, personId = 1) =>
  request<AiPrediction>('/ai/predict', {
    method: 'POST',
    body: JSON.stringify({ key_id: keyId, person_id: personId }),
  })

export const fetchAiStatus = () =>
  request<{ available: boolean; model: string; threshold_minutes: number }>('/ai/status')

export const fetchGalleryImages = () =>
  request<ApiGalleryImage[]>('/gallery')

export const uploadGalleryImage = (payload: GalleryImageCreatePayload) =>
  request<ApiGalleryImage>('/gallery', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const deleteGalleryImage = (imageId: number) =>
  request<void>(`/gallery/${imageId}`, { method: 'DELETE' })

export async function fetchGalleryImageBlob(imageId: number): Promise<string> {
  const token = getToken()
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response: Response
  try {
    response = await fetch(`${API_URL}/gallery/${imageId}/file`, { headers })
  } catch {
    throw new ApiError(
      'Sem conexão com o servidor ao carregar a imagem.',
      0
    )
  }

  if (!response.ok) {
    if (response.status === 401 && token) onUnauthorized?.()
    throw new ApiError(
      `Não foi possível carregar a imagem (código ${response.status}).`,
      response.status
    )
  }

  const blob = await response.blob()
  return URL.createObjectURL(blob)
}
