const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

interface FetchOptions extends RequestInit {
  timeout?: number
  retries?: number
}

class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

// Simple in-memory cache with TTL
const cache = new Map<string, { data: unknown; expiry: number }>()

function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (entry && Date.now() < entry.expiry) {
    return entry.data as T
  }
  if (entry) cache.delete(key)
  return null
}

function setCache(key: string, data: unknown, ttlMs: number) {
  cache.set(key, { data, expiry: Date.now() + ttlMs })
}

async function fetchWithTimeout(url: string, options: FetchOptions = {}): Promise<Response> {
  const { timeout = 10000, ...fetchOpts } = options
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, { ...fetchOpts, signal: controller.signal })
    return response
  } finally {
    clearTimeout(id)
  }
}

export async function apiGet<T>(path: string, options: FetchOptions & { cacheTtl?: number } = {}): Promise<T> {
  const { cacheTtl, retries = 1, ...fetchOpts } = options
  const url = `${API_BASE_URL}${path}`

  if (cacheTtl) {
    const cached = getCached<T>(url)
    if (cached) return cached
  }

  let lastError: Error | null = null
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, fetchOpts)
      if (!response.ok) {
        throw new ApiError(`API error: ${response.statusText}`, response.status)
      }
      const data = (await response.json()) as T
      if (cacheTtl) setCache(url, data, cacheTtl)
      return data
    } catch (err) {
      lastError = err as Error
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
      }
    }
  }
  throw lastError
}

export async function apiPost<T>(path: string, body: unknown, options: FetchOptions = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`
  const { retries = 1, ...fetchOpts } = options
  let lastError: Error | null = null
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, {
        ...fetchOpts,
        method: "POST",
        headers: { "Content-Type": "application/json", ...fetchOpts.headers },
        body: JSON.stringify(body),
      })
      if (!response.ok) {
        throw new ApiError(`API error: ${response.statusText}`, response.status)
      }
      return (await response.json()) as T
    } catch (err) {
      lastError = err as Error
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
      }
    }
  }
  throw lastError
}

export async function apiPut<T>(path: string, body: unknown, options: FetchOptions = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`
  const response = await fetchWithTimeout(url, {
    ...options,
    method: "PUT",
    headers: { "Content-Type": "application/json", ...options.headers },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    throw new ApiError(`API error: ${response.statusText}`, response.status)
  }
  return (await response.json()) as T
}

export { ApiError }
