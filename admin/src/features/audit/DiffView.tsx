type Changes = Record<string, { before: unknown; after: unknown }>

const show = (v: unknown) =>
  v === null || v === undefined
    ? "(empty)"
    : typeof v === "string"
      ? v
      : JSON.stringify(v)

/**
 * Before/after of one audited write, one row per changed field. A deliberately tiny "JSON diff":
 * the API only records the fields that changed (and never whole request bodies), so there is
 * nothing to align or collapse. Meaning is carried by the words and the +/- marks, not by colour alone.
 */
export function DiffView({ changes }: { changes: Changes | null }) {
  const keys = changes ? Object.keys(changes) : []
  if (!changes || keys.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        This request did not record a before/after (only who, what and when).
      </p>
    )
  return (
    <table className="text-sm">
      <caption className="sr-only">Fields changed by this request</caption>
      <thead>
        <tr>
          <th scope="col" className="pr-4 text-left">
            Field
          </th>
          <th scope="col" className="pr-4 text-left">
            Before
          </th>
          <th scope="col" className="text-left">
            After
          </th>
        </tr>
      </thead>
      <tbody>
        {keys.map((k) => (
          <tr key={k}>
            <th scope="row" className="pr-4 text-left font-mono font-normal">
              {k}
            </th>
            <td className="pr-4 text-destructive">
              <span aria-hidden>- </span>
              <del>{show(changes[k].before)}</del>
            </td>
            <td className="text-emerald-700 dark:text-emerald-400">
              <span aria-hidden>+ </span>
              {show(changes[k].after)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
