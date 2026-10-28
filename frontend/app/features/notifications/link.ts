/** A notification link must stay on our site: "/orders/1" yes, "//evil.com" and "https://..." no. */
export function safeSitePath(link: string | null): string | null {
  return link && /^\/(?![/\\])[^\s]*$/.test(link) ? link : null
}
