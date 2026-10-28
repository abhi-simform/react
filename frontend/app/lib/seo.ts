import { SITE_NAME, pageTitle } from "@/lib/pageTitle"

/**
 * SEO helpers (13.9). Pure functions that build the values RR's `meta` export (and JSON-LD) need, so they
 * are testable without a browser. NOTE on what SPA mode can do: tags produced here appear in the page
 * after JavaScript runs (Googlebot renders JS and reads them; most social-link crawlers do NOT).
 * Routes that are prerendered at build time (`react-router.config.ts`) get them in the HTML itself.
 */
export const siteUrl = () =>
  (import.meta.env.VITE_SITE_URL ?? "http://localhost:5173").replace(/\/$/, "")

/** Query parameters that identify a CAMPAIGN or a click, not a page: never part of the canonical URL. */
const TRACKING = /^(utm_.*|gclid|fbclid|msclkid|mc_.*|ref|source|_ga|igshid)$/i

/**
 * `https://shop.example/p/phone` for any URL of that page: tracking parameters dropped, the rest kept in
 * a stable (sorted) order, `keep` = the only parameters that are allowed to survive (default: none, so a
 * filtered listing canonicalises to the plain listing; `page` is kept explicitly by listings).
 */
export function canonicalUrl(
  pathname: string,
  search = "",
  keep: readonly string[] = []
): string {
  const params = new URLSearchParams(search)
  const kept = [...params.entries()]
    .filter(([k]) => !TRACKING.test(k) && keep.includes(k))
    .sort(([a], [b]) => a.localeCompare(b))
  const qs = new URLSearchParams(kept).toString()
  const path = pathname === "/" ? "/" : pathname.replace(/\/+$/, "")
  return `${siteUrl()}${path}${qs ? `?${qs}` : ""}`
}

type MetaDescriptor = Record<string, unknown>

type PageMeta = {
  title?: string
  description: string
  /** Absolute canonical URL (see `canonicalUrl`). */
  canonical: string
  image?: string
  /** `website` for pages, `product` for a product (Open Graph type). */
  type?: "website" | "product"
  noindex?: boolean
  jsonLd?: readonly object[]
}

/**
 * The full tag set for one page: title, description, canonical, Open Graph, Twitter card, robots and any
 * JSON-LD blocks, as React Router `meta` descriptors (`links` cannot carry rel=canonical from `meta`, so it
 * is a `{ tagName: "link" }` descriptor).
 */
export function pageMeta(m: PageMeta): MetaDescriptor[] {
  const title = pageTitle(m.title)
  return [
    { title },
    { name: "description", content: m.description },
    { tagName: "link", rel: "canonical", href: m.canonical },
    ...(m.noindex ? [{ name: "robots", content: "noindex, nofollow" }] : []),
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:type", content: m.type ?? "website" },
    { property: "og:title", content: m.title ?? SITE_NAME },
    { property: "og:description", content: m.description },
    { property: "og:url", content: m.canonical },
    ...(m.image ? [{ property: "og:image", content: m.image }] : []),
    {
      name: "twitter:card",
      content: m.image ? "summary_large_image" : "summary",
    },
    { name: "twitter:title", content: m.title ?? SITE_NAME },
    { name: "twitter:description", content: m.description },
    ...(m.image ? [{ name: "twitter:image", content: m.image }] : []),
    ...(m.jsonLd ?? []).map((json) => ({ "script:ld+json": json })),
  ]
}

/** Private or transactional pages: never in search results. */
export const noindexMeta = (title: string): MetaDescriptor[] => [
  { title: pageTitle(title) },
  { name: "robots", content: "noindex, nofollow" },
]
