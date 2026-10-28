type PlaceholderPageProps = {
  title: string
  /** Shown under the heading, e.g. the route param this page received. */
  detail?: string
  /** Which stage fills this page in. */
  builtIn?: string
}

/** Stage 5.1: every route in the map renders this until its real page exists. */
export function PlaceholderPage({
  title,
  detail,
  builtIn,
}: PlaceholderPageProps) {
  return (
    <div className="p-4">
      <h1 className="text-xl font-medium">{title}</h1>
      {detail && <p className="text-sm text-muted-foreground">{detail}</p>}
      {builtIn && (
        <p className="text-sm text-muted-foreground">
          Placeholder (stage {builtIn}).
        </p>
      )}
    </div>
  )
}
