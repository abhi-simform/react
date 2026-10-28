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
export { getProduct, getProducts } from "./api"
export {
  productDetailSchema,
  productQuerySchema,
  productSchema,
} from "./schemas"
export type {
  Product,
  ProductCardData,
  ProductDetail,
  ProductFilters,
  ProductQuery,
  ProductSort,
  ProductStatus,
} from "./types"
export { loadHomeData } from "./homeData"
export type { HomeData } from "./homeData"
