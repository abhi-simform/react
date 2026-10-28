// Public API of the compare feature.
export { CompareTrayButton } from "./components/LazyCompareDrawer"
export { CompareTray } from "./components/CompareTray"
export { CompareToggle } from "./components/CompareToggle"
export { CompareTable } from "./components/CompareTable"
export type { ComparableProduct } from "./components/CompareTable"
export {
  COMPARE_MAX,
  COMPARE_STORAGE_KEY,
  selectCompareCount,
  selectCompareItems,
  useCompareStore,
} from "./compareStore"
export type { CompareItem } from "./compareStore"
export { toggleCompare } from "./toggleCompare"
