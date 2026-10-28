type ListProps<T> = {
  items: readonly T[]
  getKey: (item: T) => string | number
  renderItem: (item: T) => React.ReactNode
  empty?: React.ReactNode
}

/** Generic list: `T` is inferred from `items`, so `renderItem`'s parameter is typed for free. */
export function List<T>({ items, getKey, renderItem, empty }: ListProps<T>) {
  if (items.length === 0) return <>{empty ?? <p>Nothing to show.</p>}</>
  return (
    <ul>
      {items.map((item) => (
        <li key={getKey(item)}>{renderItem(item)}</li>
      ))}
    </ul>
  )
}
