export class HttpError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "HttpError"
    this.status = status
  }
}

/**
 * fetch() only rejects on network failure; a 404 or 500 still RESOLVES.
 * So we check `response.ok` ourselves and throw with the server's message.
 * (Stage 2 tightens the `unknown` handling here.)
 */
export async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  if (!response.ok) {
    let detail = response.statusText
    try {
      const body = await response.json()
      detail = body?.error?.message ?? detail
    } catch {
      // body was not JSON; keep statusText
    }
    throw new HttpError(response.status, `HTTP ${response.status}: ${detail}`)
  }
  return response.json() as Promise<T>
}
