import { env } from "@/lib/env"

import { ApiError } from "./errors"
import { isApiSuccess, type Paginated, type PageMeta } from "./envelope"
import { getJson } from "./getJson"

function send(path: string, init?: RequestInit): Promise<unknown> {
  return getJson(`${env.VITE_API_URL}${path}`, {
    // Cookies (refresh token) only travel cross-origin with this flag.
    credentials: "include",
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
  })
}

function unwrap(body: unknown): { data: unknown; meta?: PageMeta } {
  if (!isApiSuccess(body)) {
    throw new ApiError({
      status: 200,
      code: "BAD_ENVELOPE",
      message: "Response was not a success envelope",
    })
  }
  return body
}

/**
 * Call the API and return the envelope's `data`.
 * NOTE: `T` is the caller's claim, not a check (the one `as` below). 2.6 makes
 * this safe by validating against a Zod schema.
 */
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = unwrap(await send(path, init))
  return data as T // trusted generic until a schema is supplied
}

/** List endpoints: `data` is the array, `meta` carries paging. */
export async function requestPaginated<T>(
  path: string,
  init?: RequestInit
): Promise<Paginated<T>> {
  const { data, meta } = unwrap(await send(path, init))
  if (!Array.isArray(data) || !meta) {
    throw new ApiError({
      status: 200,
      code: "BAD_ENVELOPE",
      message: "Expected a list with meta",
    })
  }
  return { items: data as T[], meta } // trusted generic until a schema is supplied
}
