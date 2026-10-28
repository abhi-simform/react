type EmptyStateProps = {
  /** Decorative (aria-hidden): the title says everything. */
  icon?: React.ReactNode
  title: string
  description?: string
  /** A button or link that gets the user out of the dead end. */
  action?: React.ReactNode
  /** Extra content (kept for older call sites). */
  children?: React.ReactNode
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  children,
}: EmptyStateProps) {
  return (
    <div className="rounded border border-dashed p-8 text-center">
      {icon && (
        <div aria-hidden className="mb-2 flex justify-center text-neutral-400">
          {icon}
        </div>
      )}
      <p className="font-medium">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-neutral-600">{description}</p>
      )}
      {(action || children) && (
        <div className="mt-2 text-sm text-neutral-600">
          {action ?? children}
        </div>
      )}
    </div>
  )
}
