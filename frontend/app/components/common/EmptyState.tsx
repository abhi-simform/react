export function EmptyState({
  title,
  children,
}: {
  title: string
  children?: React.ReactNode
}) {
  return (
    <div className="rounded border border-dashed p-8 text-center">
      <p className="font-medium">{title}</p>
      {children && (
        <div className="mt-2 text-sm text-neutral-600">{children}</div>
      )}
    </div>
  )
}
