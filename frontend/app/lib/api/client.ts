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

type Options<T> = RequestInit & {
  /** Validate `data` against this schema; `T` is inferred from it. */
  schema?: z.ZodType<T>
}

function send(path: string, init?: RequestInit): Promise<unknown> {
  return getJson(`${env.VITE_API_URL}${path}`, {
    // Cookies (refresh token) only travel cross-origin with this flag.
    credentials: "include",
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
  })
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
 */
export async function request<T>(
  path: string,
  { schema, ...init }: Options<T> = {}
): Promise<T> {
  const body = await send(path, init)

  if (schema && VALIDATE) {
    const result = apiEnvelopeSchema(schema).safeParse(body)
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
export async function requestPaginatedWithMeta<T, M extends PageMeta>(
  path: string,
  { schema, metaSchema, ...init }: Options<T> & { metaSchema: z.ZodType<M> }
): Promise<Paginated<T, M>> {
  const body = await send(path, init)

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

export const requestPaginated = <T>(
  path: string,
  options: Options<T> = {}
): Promise<Paginated<T>> =>
  requestPaginatedWithMeta(path, { ...options, metaSchema: pageMetaSchema })
