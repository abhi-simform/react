import type { ProductDetail } from "@/features/catalog"
import { SITE_NAME } from "@/lib/pageTitle"

/**
 * Structured data for the product page (13.9): schema.org JSON-LD that search engines read to show a rich
 * result (price, availability, stars). Built from the SAME API product the page renders; all prices are
 * INR (whole rupees), which is what the shop charges whatever currency the UI shows.
 */
const clip = (text: string, max = 155) => {
  const flat = text.replace(/\s+/g, " ").trim()
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`
}

export const productDescription = (
  p: Pick<ProductDetail, "name" | "brand" | "description">
) =>
  clip(p.description || `${p.name} by ${p.brand}. Buy online at ${SITE_NAME}.`)

export function productJsonLd(p: ProductDetail, origin: string) {
  const price = p.deal?.dealPrice ?? p.price
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    sku: p.sku,
    description: productDescription(p),
    image: p.images.map((i) => i.url),
    brand: { "@type": "Brand", name: p.brand },
    category: p.category.name,
    offers: {
      "@type": "Offer",
      url: `${origin}/p/${p.slug}`,
      priceCurrency: "INR",
      price,
      availability:
        p.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
    // Only when there ARE ratings: an aggregateRating with 0 reviews is invalid structured data.
    ...(p.ratingCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Number(p.ratingAvg.toFixed(1)),
            reviewCount: p.ratingCount,
          },
        }
      : {}),
  }
}

export function breadcrumbJsonLd(
  p: Pick<ProductDetail, "name" | "slug" | "categoryPath">,
  origin: string
) {
  const trail = [
    { name: "Home", url: `${origin}/` },
    ...p.categoryPath.map((c) => ({
      name: c.name,
      url: `${origin}/c/${c.slug}`,
    })),
    { name: p.name, url: `${origin}/p/${p.slug}` },
  ]
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: t.url,
    })),
  }
}
