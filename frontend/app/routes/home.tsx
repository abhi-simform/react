import { useSearchParams } from "react-router"

import { HealthBadge } from "@/components/common/HealthBadge"
import { LazySection } from "@/components/common/LazySection"
import { HomeRails } from "@/features/catalog"
import { FlashSaleStrip } from "@/features/deals"
import { BrandStrip, HeroCarousel, TopCategories } from "@/features/home"
import {
  ForYouRail,
  RecentlyViewedRail,
  TrendingRail,
} from "@/features/recommendations"
import { canonicalUrl, pageMeta, siteUrl } from "@/lib/seo"

/**
 * Composition only (11.10): every section is a self-contained feature component with its own
 * query, loading, error and empty states, so one slow or failing section never blocks another.
 * Above the fold (hero, flash sale) loads first; everything below is mounted/fetched on demand
 * (`LazySection`, or the rails' own in-view gate).
 */
export default function Home() {
  const [searchParams] = useSearchParams()
  return (
    <div className="flex flex-col gap-8 p-4">
      <h1 className="sr-only">ShopSphere</h1>
      <HeroCarousel />
      <FlashSaleStrip />
      <LazySection minHeightClass="min-h-32">
        <TopCategories />
      </LazySection>
      <ForYouRail />
      <TrendingRail />
      <RecentlyViewedRail />
      <LazySection minHeightClass="min-h-24">
        <BrandStrip />
      </LazySection>
      <HomeRails failRail={searchParams.get("failRail")} />
      <HealthBadge />
    </div>
  )
}

export function meta() {
  const description =
    "Shop electronics, fashion, home, beauty and more at ShopSphere: great prices, fast delivery and easy returns."
  return pageMeta({
    description,
    canonical: canonicalUrl("/"),
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "ShopSphere",
        url: siteUrl(),
        // Lets a search engine offer a site-search box under the result.
        potentialAction: {
          "@type": "SearchAction",
          target: `${siteUrl()}/products?search={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  })
}
