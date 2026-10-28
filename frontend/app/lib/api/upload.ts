import type { z } from "zod"

import { env } from "@/lib/env"

import { getApiConfig } from "./client"
import { isApiError, isApiSuccess } from "./envelope"
import { ApiError, NETWORK_MESSAGE, TIMEOUT_MESSAGE } from "./errors"
import { apiEnvelopeSchema } from "./schemas"

type Options<T> = {
  onProgress?: (fraction: number) => void
  signal?: AbortSignal
  schema?: z.ZodType<T>
  timeoutMs?: number
}

/**
 * Multipart upload with PROGRESS (7.8). `fetch` cannot report upload progress (no stable
 * `ReadableStream` request bodies / progress events in browsers), `XMLHttpRequest` can:
 * `xhr.upload.onprogress`. This is the one deliberate exception to "only getJson calls the
 * network" (6.2), and it keeps the same contract: bearer token, one 401 -> refresh -> retry,
 * `ApiError` for every failure, and the caller's own `AbortError` when it cancels.
 *
 * Do NOT set `Content-Type` yourself: the browser writes `multipart/form-data; boundary=...`
 * for a `FormData` body. Setting it by hand drops the boundary and the server cannot parse it.
 */
export async function apiUpload<T>(
  path: string,
  form: FormData,
  { onProgress, signal, schema, timeoutMs = 60_000 }: Options<T> = {}
): Promise<T> {
  const attempt = () => send(path, form, { onProgress, signal, timeoutMs })
  let result
  try {
    result = await attempt()
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      const retry = await getApiConfig().onUnauthorized?.(err)
      if (retry === true)
        result = await attempt() // exactly once
      else throw err
    } else throw err
  }
  if (schema && env.DEV) {
    const parsed = apiEnvelopeSchema(schema).safeParse(result)
    if (!parsed.success)
      throw new ApiError({
        status: 200,
        code: "CONTRACT_ERROR",
        message: `API contract mismatch for ${path}`,
      })
    return parsed.data.data
  }
  if (!isApiSuccess(result))
    throw new ApiError({
      status: 200,
      code: "BAD_ENVELOPE",
      message: "Response was not a success envelope",
    })
  return result.data as T // trusted generic: no schema, or validation is off
}

function send(
  path: string,
  form: FormData,
  {
    onProgress,
    signal,
    timeoutMs,
  }: {
    onProgress?: (f: number) => void
    signal?: AbortSignal
    timeoutMs: number
  }
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason)
    const xhr = new XMLHttpRequest()
    xhr.open("POST", `${env.VITE_API_URL}${path}`)
    xhr.withCredentials = true // refresh cookie, like api()
    xhr.timeout = timeoutMs
    xhr.setRequestHeader("Accept", "application/json")
    const token = getApiConfig().getAccessToken?.()
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total)
    }
    const onAbort = () => {
      xhr.abort() // fires `onabort`; the request is cancelled on the wire
    }
    signal?.addEventListener("abort", onAbort, { once: true })
    const done = () => signal?.removeEventListener("abort", onAbort)

    xhr.onload = () => {
      done()
      let body: unknown
      try {
        body = JSON.parse(xhr.responseText)
      } catch {
        body = undefined
      }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(body)
      if (isApiError(body))
        return reject(
          new ApiError({
            status: xhr.status,
            code: body.error.code,
            message: `HTTP ${xhr.status}: ${body.error.message}`,
            details: body.error.details,
          })
        )
      reject(
        new ApiError({
          status: xhr.status,
          code: "HTTP_ERROR",
          message: `HTTP ${xhr.status}: ${xhr.statusText || "Upload failed"}`,
        })
      )
    }
    xhr.onerror = () => {
      done()
      reject(
        new ApiError({
          status: 0,
          code: "NETWORK_ERROR",
          message: NETWORK_MESSAGE,
        })
      )
    }
    xhr.ontimeout = () => {
      done()
      reject(
        new ApiError({ status: 0, code: "TIMEOUT", message: TIMEOUT_MESSAGE })
      )
    }
    xhr.onabort = () => {
      done()
      reject(new DOMException("Upload cancelled", "AbortError"))
    }
    xhr.send(form)
  })
}
