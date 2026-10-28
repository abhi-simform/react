import { CATALOG_NAME } from "./catalog.ts"

// Evaluated while catalog.ts has not finished running: CATALOG_NAME is not initialised yet.
export const cartLabel = `cart for ${CATALOG_NAME}`
