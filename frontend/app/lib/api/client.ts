import type { z } from "zod"

import { env } from "@/lib/env"

import { ApiError, ContractError } from "./errors"
import { isApiSuccess, type PageMeta, type Paginated } from "./envelope"
import { getJson } from "./getJson"
import {
  apiEnvelopeSchema,
  pageMetaSchema,
  paginatedWithMetaSchema,
} from "./schemas"

// ---- configuration (Stage 10 plugs the real session in here) ---------------

type ApiConfig = {
  /** Called for every `auth: true` request. Returns the in-memory access token. */
  getAccessToken?: () => string | null
  /**
   * Called on a 401 of an `auth: true` request. Return (or resolve) `true`
   * when a new token is now available: the request is then retried ONCE.
   */
  onUnauthorized?: (error: ApiError) => boolean | Promise<boolean>
}

let config: ApiConfig = {}

export function configureApi(next: ApiConfig): void {
  config = { ...config, ...next }
}

// ---- options -----------------------------------------------------------------

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

export type ApiOptions<T> = {
  method?: Method
  /** `undefined` and `null` values are skipped; arrays become repeated keys (`?a=1&a=2`). */
  query?: Record<string, unknown>
  /** Plain data is sent as JSON; `FormData`, `Blob` and strings are sent untouched. */
  body?: unknown
  signal?: AbortSignal
  /** Validate `data` against this schema; `T` is inferred from it. */
  schema?: z.ZodType<T>
  /** Attach `Authorization: Bearer <token>` (and handle 401). */
  auth?: boolean
  timeoutMs?: number
}

function appendQuery(path: string, query?: Record<string, unknown>): string {
  if (!query) return path
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue
    for (const v of Array.isArray(value) ? (value as unknown[]) : [value]) {
      search.append(key, String(v))
    }
  }
  const qs = search.toString()
  if (!qs) return path
  return `${path}${path.includes("?") ? "&" : "?"}${qs}`
}

function isRawBody(body: unknown): body is BodyInit {
  return (
    typeof body === "string" ||
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof URLSearchParams ||
    body instanceof ArrayBuffer
  )
}

async function send<T>(
  path: string,
  options: ApiOptions<T>
): Promise<{ status: number; body: unknown }> {
  const attempt = () => {
    const headers: Record<string, string> = { Accept: "application/json" }
    let body: BodyInit | undefined
    if (options.body !== undefined) {
      if (isRawBody(options.body)) {
        body = options.body // FormData sets its own multipart boundary header
      } else {
        body = JSON.stringify(options.body)
        headers["Content-Type"] = "application/json"
      }
    }
    if (options.auth) {
      const token = config.getAccessToken?.()
      if (token) headers.Authorization = `Bearer ${token}`
    }
    return getJson(`${env.VITE_API_URL}${appendQuery(path, options.query)}`, {
      method: options.method ?? "GET",
      // Cookies (refresh token) only travel cross-origin with this flag.
      credentials: "include",
      headers,
      body,
      signal: options.signal,
      timeoutMs: options.timeoutMs,
    })
  }

  try {
    return await attempt()
  } catch (err) {
    if (options.auth && err instanceof ApiError && err.status === 401) {
      const retry = await config.onUnauthorized?.(err)
      if (retry === true) return attempt() // exactly once
    }
    throw err
  }
}

function badEnvelope(message: string): ApiError {
  return new ApiError({ status: 200, code: "BAD_ENVELOPE", message })
}

function contractError(path: string, error: z.ZodError): ContractError {
  const err = new ContractError(path, error.issues)
  console.error(err.message, error.issues)
  return err
}

/**
 * Validate responses in development only (strict feedback while we build) and
 * trust the server in production builds (saves CPU on big lists). Trade-off:
 * in production a contract change is no longer caught at the boundary, it shows
 * up later as `undefined`/`NaN` in the UI, so error reporting (Stage 14) matters.
 */
const VALIDATE = env.DEV

/**
 * Call the API and return the envelope's `data`.
 * With `schema`, `data` is parsed (dev) and `T` comes from the schema.
 * Without it, `T` is the caller's claim, not a check (the one `as` below).
 * A 204 (logout, wishlist delete) has no body: it resolves to `undefined`.
 */
export async function api<T = void>(
  path: string,
  options: ApiOptions<T> = {}
): Promise<T> {
  const { status, body } = await send(path, options)
  if (status === 204) return undefined as T

  if (options.schema && VALIDATE) {
    const result = apiEnvelopeSchema(options.schema).safeParse(body)
    if (!result.success) throw contractError(path, result.error)
    return result.data.data
  }
  if (!isApiSuccess(body))
    throw badEnvelope("Response was not a success envelope")
  return body.data as T // trusted generic: no schema, or validation is off
}

/**
 * List endpoints: `data` is the array, `meta` carries paging. `metaSchema`
 * lets a feature validate extra meta keys (catalog adds `facets`).
 */
export async function apiPaginatedWithMeta<T, M extends PageMeta>(
  path: string,
  options: ApiOptions<T> & { metaSchema: z.ZodType<M> }
): Promise<Paginated<T, M>> {
  const { metaSchema, schema } = options
  const { body } = await send(path, options)

  if (schema && VALIDATE) {
    const result = paginatedWithMetaSchema(schema, metaSchema).safeParse(body)
    if (!result.success) throw contractError(path, result.error)
    return { items: result.data.data, meta: result.data.meta }
  }
  if (!isApiSuccess(body) || !Array.isArray(body.data) || !body.meta) {
    throw badEnvelope("Expected a list envelope with meta")
  }
  // trusted generics: no schema, or validation is off
  return { items: body.data as T[], meta: body.meta as M }
}

export const apiPaginated = <T>(
  path: string,
  options: ApiOptions<T> = {}
): Promise<Paginated<T>> =>
  apiPaginatedWithMeta(path, { ...options, metaSchema: pageMetaSchema })
