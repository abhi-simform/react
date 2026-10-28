import { canonicalUrl, siteUrl } from "@/lib/seo"
import { pageTitle } from "@/lib/pageTitle"
import type { ProductDetail } from "@/features/catalog"

import { breadcrumbJsonLd, productDescription, productJsonLd } from "../seo"

/**
 * Head tags of the product page (13.9). React 19 hoists `<title>`, `<meta>` and `<link>` rendered anywhere
 * into `<head>` (and removes them when the page unmounts), so a page can own its metadata without an
 * effect. The JSON-LD blocks are scripts and stay where they are rendered (valid anywhere in the page).
 * Honest limit: this exists only after the JavaScript has run (SPA). See docs/perf-log.md, 13.9.
 */
export function ProductSeo({ product }: { product: ProductDetail }) {
  const origin = siteUrl()
  const url = canonicalUrl(`/p/${product.slug}`)
  const description = productDescription(product)
  const image = product.images[0]?.url
  return (
    <>
      <title>{pageTitle(product.name)}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:type" content="product" />
      <meta property="og:site_name" content="ShopSphere" />
      <meta property="og:title" content={product.name} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      {image && <meta property="og:image" content={image} />}
      <meta
        name="twitter:card"
        content={image ? "summary_large_image" : "summary"}
      />
      <meta name="twitter:title" content={product.name} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd(product, origin)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd(product, origin)),
        }}
      />
    </>
  )
}
