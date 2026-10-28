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

// UI and hooks other features / routes may use.
export { ProductCard } from "./components/ProductCard"
export type { ProductCardProduct } from "./components/ProductCard"
export { ProductCardSkeleton } from "./components/ProductCardSkeleton"
export { ProductGrid } from "./components/ProductGrid"
export { HomeRails } from "./components/HomeRails"
export { ProductListingPage } from "./components/ProductListingPage"
export { useProducts } from "./hooks/useProducts"
export { useCategory, useCategoryTree } from "./hooks/useCategories"
export { useProductFilters } from "./hooks/useProductFilters"
export { getBrands, getCategory, getCategoryTree } from "./api"
export {
  parseFilters,
  toProductQuery,
  toSearchParams,
  PAGE_SIZE,
} from "./filters"
export type { ListingFilters } from "./filters"
export type {
  Brand,
  CategoryDetail,
  CategoryNode,
  Facets,
  ProductListMeta,
} from "./types"
