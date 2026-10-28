// Public API of the catalog feature. Other features import from here only.
// Explicit named re-exports (not `export *`) keep the surface deliberate and tree-shakable.
export {
  brandCounts,
  compareBy,
  displayDiscount,
  filterProducts,
  filterWithFacets,
  priceHistogram,
  safeBrandName,
  sortProducts,
} from "./utils"
export type { PriceBucket, SortKey } from "./utils"
export type { Product, ProductFilters } from "./types"
export { loadHomeData } from "./homeData"
export type { HomeData } from "./homeData"
