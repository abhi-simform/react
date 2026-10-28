type QueryValue = string | number | boolean | readonly string[] | undefined

/** Build "?a=1&b=x,y" from a plain object; undefined and empty values are dropped. */
export function toQueryString(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue
    if (typeof value === "object") {
      if (value.length > 0) search.set(key, value.join(","))
    } else {
      search.set(key, String(value))
    }
  }
  const query = search.toString()
  return query ? `?${query}` : ""
}
