import { logger } from '../utils/logger'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

interface RequestOptions {
  headers?: Record<string, string>
  signal?: AbortSignal
}

async function request<T>(method: string, path: string, body?: unknown, options?: RequestOptions): Promise<T> {
  const url = `${BASE_URL}${path}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options?.headers,
  }

  const token = localStorage.getItem('auth_token')
  if (token) headers['Authorization'] = `Bearer ${token}`

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: options?.signal,
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '')
      throw new ApiError(response.status, errorBody || response.statusText)
    }

    return response.json() as Promise<T>
  } catch (err) {
    if (err instanceof ApiError) throw err
    logger.error('api.request', err)
    throw new ApiError(0, 'Network error')
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, undefined, options),
  post: <T>(path: string, body: unknown, options?: RequestOptions) => request<T>('POST', path, body, options),
  put: <T>(path: string, body: unknown, options?: RequestOptions) => request<T>('PUT', path, body, options),
  patch: <T>(path: string, body: unknown, options?: RequestOptions) => request<T>('PATCH', path, body, options),
  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, undefined, options),
}
