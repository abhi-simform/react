import { cartLabel } from "./cart.ts"
import { CATALOG_NAME } from "./names.ts"

export const catalogSummary = () => `${CATALOG_NAME} + ${cartLabel}`
