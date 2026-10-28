/** What a route module may put in `export const handle`. Read back through `useMatches()`. */
export type RouteHandle = {
  /** Label shown in the breadcrumb trail. Omit it for routes whose crumbs depend on data. */
  breadcrumb?: string
}

/** `useMatches()` types `handle` as `unknown`: narrow it instead of casting. */
export function getBreadcrumb(handle: unknown): string | undefined {
  if (typeof handle !== "object" || handle === null) return undefined
  if (!("breadcrumb" in handle)) return undefined
  return typeof handle.breadcrumb === "string" ? handle.breadcrumb : undefined
}
