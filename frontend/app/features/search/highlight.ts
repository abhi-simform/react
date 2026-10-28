export type Segment = { text: string; match: boolean }

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/**
 * Split `text` into plain and matching parts for every word of `query` (case-insensitive), so the
 * view can wrap the matches in `<mark>` WITHOUT `dangerouslySetInnerHTML`: product names are
 * data, and an HTML string built from them would be an injection point. Regex characters in the
 * query are escaped ("c++" is a literal), and the parts always concatenate back to `text`.
 */
export function splitMatches(text: string, query: string): Segment[] {
  const words = [...new Set(query.trim().split(/\s+/).filter(Boolean))]
  if (words.length === 0) return [{ text, match: false }]
  // Longest first, so "samsung" wins over "sam" at the same position.
  const re = new RegExp(
    `(${words
      .sort((a, b) => b.length - a.length)
      .map(escapeRegex)
      .join("|")})`,
    "gi"
  )
  const out: Segment[] = []
  let last = 0
  for (const m of text.matchAll(re)) {
    const start = m.index
    if (start > last) out.push({ text: text.slice(last, start), match: false })
    out.push({ text: m[0], match: true })
    last = start + m[0].length
  }
  if (last < text.length) out.push({ text: text.slice(last), match: false })
  return out.length ? out : [{ text, match: false }]
}
