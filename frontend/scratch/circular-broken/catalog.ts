// BROKEN ON PURPOSE: catalog and cart import each other.
import { cartLabel } from "./cart.ts"

export const CATALOG_NAME = "catalog"
export const catalogSummary = () => `${CATALOG_NAME} + ${cartLabel}`
