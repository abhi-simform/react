import { useEffect } from "react"
import { toast } from "sonner"

/**
 * Keeps a form's unsaved values in `sessionStorage` (10.7), so a session that expires while the
 * form is open does not cost the user their typing: the 401 sends them to /login?from=<this page>,
 * and after login the same form restores its draft. `sessionStorage` (not localStorage): it is
 * per tab and dies with the tab, so drafts never reach another browser session. The key must
 * include the user id (a different person logging in must not inherit the draft). Drafts
 * are wiped on an explicit logout (`clearAllDrafts`), but NOT on a session-expiry logout.
 * Never store passwords or other secrets in a draft: use it for ordinary fields only.
 */
const PREFIX = "shopsphere.draft:"

function read(key: string): Record<string, unknown> | null {
  try {
    const raw = window.sessionStorage.getItem(PREFIX + key)
    const value: unknown = raw ? JSON.parse(raw) : null
    return typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown): void {
  try {
    window.sessionStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* storage blocked or full: the draft is a convenience */
  }
}

export function clearDraft(key: string): void {
  try {
    window.sessionStorage.removeItem(PREFIX + key)
  } catch {
    /* nothing to clear */
  }
}

export function clearAllDrafts(): void {
  try {
    for (const k of Object.keys(window.sessionStorage))
      if (k.startsWith(PREFIX)) window.sessionStorage.removeItem(k)
  } catch {
    /* nothing to clear */
  }
}

/** The three parts of a React Hook Form `useForm()` result this hook needs (any form fits). */
type DraftForm = {
  setValue: (
    name: never,
    value: never,
    options: { shouldDirty: boolean }
  ) => void
  watch: (callback: (values: unknown) => void) => { unsubscribe: () => void }
  formState: { defaultValues?: unknown }
}

export function useFormDraft(
  key: string,
  form: DraftForm
): { clear: () => void } {
  const { setValue, watch, formState } = form
  // Restore once, as DIRTY values, so "Save" is enabled and the user sees what was recovered.
  useEffect(() => {
    const draft = read(key)
    if (!draft) return
    for (const [field, value] of Object.entries(draft))
      setValue(field as never, value as never, { shouldDirty: true })
    toast.info("We restored your unsaved changes.", { id: "draft-restored" })
  }, [key, setValue])

  // Save on every change that differs from the saved baseline.
  useEffect(() => {
    const subscription = watch((values) => {
      const baseline = JSON.stringify(formState.defaultValues)
      if (JSON.stringify(values) === baseline) clearDraft(key)
      else write(key, values)
    })
    return () => subscription.unsubscribe()
  }, [key, watch, formState])

  return { clear: () => clearDraft(key) }
}
