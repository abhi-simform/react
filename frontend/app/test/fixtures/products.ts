import { paginatedSchema } from "@/lib/api/schemas"
import { productSchema } from "@/features/catalog"

import raw from "./products.json"

// The snapshot is validated with the same schema the live API uses, so the
// fixture cannot drift from the contract (it replaces the Stage 2.1 loader that
// narrowed `status` by hand).
export const productsFixture = paginatedSchema(productSchema).parse(raw).data
