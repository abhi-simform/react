/** Group items by a key function. The key type K is inferred from the selector. */
export function groupBy<T, K extends PropertyKey>(
  items: readonly T[],
  key: (item: T) => K
): Record<K, T[]> {
  const result = {} as Record<K, T[]> // filled below; empty object is a valid start
  for (const item of items) {
    const k = key(item)
    ;(result[k] ??= []).push(item)
  }
  return result
}
