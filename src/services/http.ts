const BASE_URL: string = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly detail?: string,
    path = '',
  ) {
    super(`Request to ${path} failed with status ${status}`)
    this.name = 'ApiError'
  }
}

export async function get<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))
  const res = await fetch(`${BASE_URL}${path}?${qs}`)
  if (!res.ok) {
    // FastAPI errors carry {detail: "..."}; keep it when it is a plain string.
    const body = (await res.json().catch(() => ({}))) as { detail?: unknown }
    throw new ApiError(res.status, typeof body.detail === 'string' ? body.detail : undefined, path)
  }
  return (await res.json()) as T
}
