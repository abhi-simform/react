import type { FieldValues, Path, UseFormSetError } from "react-hook-form"

import type { ApiError } from "@/lib/api/errors"

type CodeRule<T extends FieldValues> = {
  /** Put the message under this field (and focus it) instead of at form level. */
  field?: Path<T>
  message: string
}

type Options<T extends FieldValues> = {
  /** The form's own field names: a server `path` not in this list cannot be shown under a field. */
  fields: readonly Path<T>[]
  /** Specific user-facing messages by `ApiError.code` (e.g. EMAIL_TAKEN). */
  codes?: Partial<Record<string, CodeRule<T>>>
}

/** Backend messages arrive as "HTTP 409: ..." (the client adds the prefix); users must not see it. */
export const serverMessage = (error: ApiError): string =>
  error.message.replace(/^HTTP \d+: /, "")

/**
 * Maps an `ApiError` onto the form (7.3), in this order:
 * 1. a 422 with `details[{path,message}]` -> `setError(path)` for EVERY field we own
 *    (all are shown at once; the first gets focus),
 * 2. a known `code` (EMAIL_TAKEN, INVALID_CREDENTIALS...) -> a field or form-level message,
 * 3. network / timeout -> a root error typed "network"/"timeout" so `FormError` offers retry,
 * 4. anything else -> a generic root error with the server's own sentence.
 * Root errors live under `errors.root.server`; RHF clears field errors on the next change
 * but root errors only on the next submit.
 */
export function applyApiError<T extends FieldValues>(
  error: ApiError,
  setError: UseFormSetError<T>,
  { fields, codes = {} }: Options<T>
): void {
  const root = (type: string, message: string) =>
    setError("root.server", { type, message })

  if (error.isValidation) {
    const matched = Object.entries(error.fieldErrors).filter(([path]) =>
      (fields as readonly string[]).includes(path)
    )
    matched.forEach(([path, message], i) =>
      setError(
        path as Path<T>,
        { type: "server", message },
        { shouldFocus: i === 0 }
      )
    )
    if (matched.length === 0)
      root(
        "server",
        "Some details are not valid. Check the form and try again."
      )
    return
  }

  const rule = codes[error.code]
  if (rule) {
    if (rule.field)
      setError(
        rule.field,
        { type: "server", message: rule.message },
        { shouldFocus: true }
      )
    else root("server", rule.message)
    return
  }
  if (error.isNetwork) return root("network", error.message)
  if (error.isTimeout) return root("timeout", error.message)
  root("server", serverMessage(error))
}
