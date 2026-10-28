import { splitMatches } from "../highlight"

/** Text with the parts matching `query` in <mark>. Pure React text nodes: no HTML string anywhere. */
export function Highlight({ text, query }: { text: string; query: string }) {
  return (
    <>
      {splitMatches(text, query).map((s, i) =>
        s.match ? (
          <mark key={i} className="rounded-sm bg-yellow-200 text-black">
            {s.text}
          </mark>
        ) : (
          <span key={i}>{s.text}</span>
        )
      )}
    </>
  )
}
