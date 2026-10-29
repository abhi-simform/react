import { env } from "@/lib/env"
import { ApiError, NETWORK_MESSAGE, TIMEOUT_MESSAGE } from "./errors"

// Slimmed copy of /frontend/app/lib/api (client.ts + getJson.ts + upload.ts). Differences:
// no response schemas (types are claims; forms validate with Zod), and it ALSO serves a text
// download (CSV). The auth module plugs the token and the 401 refresh handler in.

type Config = {
  getAccessToken?: () => string | null
  /** Resolve `true` when a fresh token is available: the request is retried ONCE. */
  onUnauthorized?: (ctx: { token: string | null }) => Promise<boolean>
}
let config: Config = {}
export const configureApi = (next: Config) =>
  void (config = { ...config, ...next })

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
export type PageMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}
export type Paginated<T> = { items: T[]; meta: PageMeta }

type Options = {
  method?: Method
  query?: Record<string, unknown>
  body?: unknown
  /** Extra request headers (e.g. `Idempotency-Key` on a refund). */
  headers?: Record<string, string>
  signal?: AbortSignal
  timeoutMs?: number
}

function withQuery(path: string, query?: Record<string, unknown>) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(query ?? {}))
    if (v !== undefined && v !== null && v !== "") qs.append(k, String(v))
  const s = qs.toString()
  return s ? `${path}?${s}` : path
}

const errorName = (e: unknown) => (e as { name?: string } | null)?.name

async function request(path: string, o: Options, accept: string) {
  const deadline = AbortSignal.timeout(o.timeoutMs ?? 15_000)
  const signal = o.signal ? AbortSignal.any([o.signal, deadline]) : deadline
  const headers: Record<string, string> = { Accept: accept, ...o.headers }
  let body: BodyInit | undefined
  if (o.body !== undefined) {
    body = JSON.stringify(o.body)
    headers["Content-Type"] = "application/json"
  }
  const token = config.getAccessToken?.() ?? null
  if (token) headers.Authorization = `Bearer ${token}`
  let res: Response
  try {
    res = await fetch(`${env.API_URL}${withQuery(path, o.query)}`, {
      method: o.method ?? "GET",
      credentials: "include", // the refresh cookie
      headers,
      body,
      signal,
    })
  } catch (err) {
    if (o.signal?.aborted) throw err // the caller gave up: not an error
    if (errorName(err) === "TimeoutError")
      throw new ApiError({
        status: 0,
        code: "TIMEOUT",
        message: TIMEOUT_MESSAGE,
      })
    throw new ApiError({
      status: 0,
      code: "NETWORK_ERROR",
      message: NETWORK_MESSAGE,
    })
  }
  if (!res.ok) {
    const json = (await res.json().catch(() => undefined)) as
      | { error?: { code?: string; message?: string; details?: unknown } }
      | undefined
    throw new ApiError({
      status: res.status,
      code: json?.error?.code ?? "HTTP_ERROR",
      message: json?.error?.message ?? `HTTP ${res.status}`,
      details: json?.error?.details,
    })
  }
  return { res, token }
}

const TOKEN_PROBLEMS = new Set([
  "TOKEN_EXPIRED",
  "INVALID_TOKEN",
  "UNAUTHORIZED",
])
const isAuthPath = (p: string) => /^\/auth\/(login|refresh|logout)/.test(p)

async function send(path: string, o: Options, accept: string) {
  // The token THIS request is about to carry. It must be read now, not in the catch block: by the time a
  // second parallel 401 arrives, another request may already have refreshed, and reading the "current"
  // token then would make a stale request look fresh (and trigger a second, replayed refresh).
  const usedToken = config.getAccessToken?.() ?? null
  try {
    return await request(path, o, accept)
  } catch (err) {
    if (
      err instanceof ApiError &&
      err.status === 401 &&
      TOKEN_PROBLEMS.has(err.code) &&
      !isAuthPath(path)
    ) {
      // `TOKEN_EXPIRED` -> the single-flight refresh in lib/auth/session.ts, then ONE retry.
      if ((await config.onUnauthorized?.({ token: usedToken })) === true)
        return request(path, o, accept)
    }
    throw err
  }
}

export async function api<T = void>(path: string, o: Options = {}): Promise<T> {
  const { res } = await send(path, o, "application/json")
  if (res.status === 204) return undefined as T
  const json = (await res.json()) as { data: T }
  return json.data
}

export async function apiPaged<T>(
  path: string,
  o: Options = {}
): Promise<Paginated<T>> {
  const { res } = await send(path, o, "application/json")
  const json = (await res.json()) as { data: T[]; meta: PageMeta }
  return { items: json.data, meta: json.meta }
}

/** An authenticated file download (the CSV export): `<a href>` cannot send the bearer header. */
export async function apiText(path: string, o: Options = {}): Promise<string> {
  const { res } = await send(path, o, "text/csv")
  return res.text()
}

/**
 * Multipart upload with PROGRESS: `fetch` cannot report upload progress, XHR can. Same token and
 * ONE refresh-and-retry on 401 as `api()`. (Copied from /frontend/app/lib/api/upload.ts.)
 */
export async function apiUpload<T>(
  path: string,
  form: FormData,
  {
    onProgress,
    signal,
  }: { onProgress?: (fraction: number) => void; signal?: AbortSignal } = {}
): Promise<T> {
  const usedToken = config.getAccessToken?.() ?? null
  const attempt = () =>
    new Promise<{ data: T }>((resolve, reject) => {
      if (signal?.aborted) return reject(signal.reason)
      const xhr = new XMLHttpRequest()
      xhr.open("POST", `${env.API_URL}${path}`)
      xhr.withCredentials = true
      xhr.timeout = 60_000
      xhr.setRequestHeader("Accept", "application/json")
      const token = config.getAccessToken?.()
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`)
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress?.(e.loaded / e.total)
      }
      signal?.addEventListener("abort", () => xhr.abort(), { once: true })
      xhr.onload = () => {
        let body: {
          data?: T
          error?: { code?: string; message?: string; details?: unknown }
        } = {}
        try {
          body = JSON.parse(xhr.responseText)
        } catch {
          /* not JSON */
        }
        if (xhr.status >= 200 && xhr.status < 300)
          return resolve(body as { data: T })
        reject(
          new ApiError({
            status: xhr.status,
            code: body.error?.code ?? "HTTP_ERROR",
            message: body.error?.message ?? `HTTP ${xhr.status}`,
            details: body.error?.details,
          })
        )
      }
      xhr.onerror = () =>
        reject(
          new ApiError({
            status: 0,
            code: "NETWORK_ERROR",
            message: NETWORK_MESSAGE,
          })
        )
      xhr.ontimeout = () =>
        reject(
          new ApiError({ status: 0, code: "TIMEOUT", message: TIMEOUT_MESSAGE })
        )
      xhr.onabort = () =>
        reject(new DOMException("Upload cancelled", "AbortError"))
      xhr.send(form)
    })
  try {
    return (await attempt()).data
  } catch (err) {
    if (
      err instanceof ApiError &&
      err.status === 401 &&
      TOKEN_PROBLEMS.has(err.code)
    ) {
      if ((await config.onUnauthorized?.({ token: usedToken })) === true)
        return (await attempt()).data
    }
    throw err
  }
}
