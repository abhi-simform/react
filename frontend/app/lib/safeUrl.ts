/**
 * Untrusted URLs (10.9). React escapes TEXT, but a URL is not text: `href="javascript:alert(1)"`
 * runs script on click, and a user-supplied `src` can point a tracking pixel (or worse) at
 * every viewer. Anything that came from a user (avatar, seller image, "website" fields) goes
 * through these before it reaches `href`/`src`.
 */
function parse(value: unknown): URL | null {
  if (typeof value !== "string" || value.length > 2048) return null
  try {
    return new URL(value)
  } catch {
    return null
  }
}

/** Only http(s) pages: rejects `javascript:`, `data:`, `vbscript:`, `file:` and non-URLs. */
export function safeHref(value: unknown): string | null {
  const url = parse(value)
  return url && (url.protocol === "https:" || url.protocol === "http:")
    ? url.href
    : null
}

/** Images: https only in production builds (http allowed under `vite dev` for localhost uploads). */
export function safeImageSrc(value: unknown): string | null {
  const url = parse(value)
  if (!url) return null
  if (url.protocol === "https:") return url.href
  if (import.meta.env.DEV && url.protocol === "http:") return url.href
  // The API serves uploads over http://localhost in development only.
  return null
}

/** Props for a link to an EXTERNAL site: opens in a new tab without giving it `window.opener`. */
export const externalLinkProps = {
  target: "_blank",
  rel: "noopener noreferrer",
} as const
