// Pure helpers. No React imports.

/** Recursively freeze, so any accidental mutation throws in strict mode. */
export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const key of Reflect.ownKeys(value)) {
      deepFreeze((value as Record<PropertyKey, unknown>)[key])
    }
  }
  return value
}

/** Returns a new Set with `id` added if absent, removed if present. */
export function toggle<T>(set: ReadonlySet<T>, id: T): Set<T> {
  const next = new Set(set)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}
