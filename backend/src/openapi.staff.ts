import { z } from "zod"
import * as C from "./modules/categories/category.admin.schema.js"
import * as P from "./modules/products/product.admin.schema.js"
import * as U from "./modules/users/user.admin.schema.js"

// B1 (catalog write) + B11 (admin users) paths. Built from the same Zod schemas the routes validate with.
const json = (schema: z.ZodType) =>
  z.toJSONSchema(schema, { io: "input", unrepresentable: "any" })
const body = (schema: z.ZodType) => ({
  required: true,
  content: { "application/json": { schema: json(schema) } },
})
const queryParams = (schema: z.ZodType) =>
  Object.entries(json(schema).properties as Record<string, object>).map(([name, s]) => ({
    name,
    in: "query",
    required: false,
    schema: s,
  }))
const id = { name: "id", in: "path", required: true, schema: { type: "string" } }
const bearer = [{ bearerAuth: [] }]
const std = {
  401: { description: "UNAUTHORIZED" },
  403: { description: "FORBIDDEN (wrong role)" },
}

// The same handlers are mounted under /admin/products (admin, every product) and
// /seller/products (seller or admin; ONLY the caller's own products, others are 404).
const productPaths = (base: string, who: string, tag: string) => ({
  [base]: {
    get: {
      tags: [tag],
      summary: `List products incl. draft/archived (${who}). Partial search on name/sku/brand, sortable, paginated`,
      security: bearer,
      parameters: queryParams(P.listAdminProductsSchema.query),
      responses: { 200: { description: "Product[] + page meta" }, ...std },
    },
    post: {
      tags: [tag],
      summary: `Create a product with variants, specs and images (${who}). Whole-rupee integer prices; price <= mrp`,
      security: bearer,
      requestBody: body(P.createProductSchema.body),
      responses: {
        201: { description: "Product" },
        409: { description: "SKU_TAKEN / SLUG_TAKEN (details[].path = sku | slug)" },
        422: {
          description:
            "VALIDATION_ERROR; details[].path is nested, e.g. variants.1.sku, specs.0.value",
        },
        ...std,
      },
    },
  },
  [`${base}/export.csv`]: {
    get: {
      tags: [tag],
      summary:
        "CSV of the current filtered/sorted list (max 5000 rows; formula-looking cells are escaped)",
      security: bearer,
      parameters: queryParams(P.exportProductsSchema.query),
      responses: { 200: { description: "text/csv" }, ...std },
    },
  },
  [`${base}/bulk`]: {
    post: {
      tags: [tag],
      summary:
        "Set the status of up to 100 products. Ids that are not yours do not match",
      security: bearer,
      requestBody: body(P.bulkProductsSchema.body),
      responses: { 200: { description: "{ requested, matched, modified }" }, ...std },
    },
  },
  [`${base}/{id}`]: {
    get: {
      tags: [tag],
      summary: "One product (any status). 404 if it is not in your scope",
      security: bearer,
      parameters: [id],
      responses: {
        200: { description: "Product" },
        404: { description: "NOT_FOUND" },
        ...std,
      },
    },
    patch: {
      tags: [tag],
      summary:
        "Partial update. A price drop queues the wishlist alert job. With variants, `stock` is derived (422 if sent)",
      security: bearer,
      parameters: [id],
      requestBody: body(P.updateProductSchema.body),
      responses: {
        200: { description: "Product" },
        404: { description: "NOT_FOUND" },
        409: { description: "SKU_TAKEN" },
        422: { description: "VALIDATION_ERROR" },
        ...std,
      },
    },
    delete: {
      tags: [tag],
      summary: "Archive (status = archived; hidden from the storefront, history kept)",
      security: bearer,
      parameters: [id],
      responses: {
        200: { description: "Product" },
        404: { description: "NOT_FOUND" },
        ...std,
      },
    },
  },
})

export const staffPaths = {
  ...productPaths("/admin/products", "admin", "Admin"),
  ...productPaths("/seller/products", "seller", "Seller"),
  "/admin/categories": {
    get: {
      tags: ["Admin"],
      summary: "Flat category list incl. inactive, with direct product counts (admin)",
      security: bearer,
      responses: { 200: { description: "Category[]" }, ...std },
    },
    post: {
      tags: ["Admin"],
      summary:
        "Create a category (slug generated, unique); ancestors computed from the parent",
      security: bearer,
      requestBody: body(C.createCategorySchema.body),
      responses: {
        201: { description: "Category" },
        422: { description: "VALIDATION_ERROR" },
        ...std,
      },
    },
  },
  "/admin/categories/reorder": {
    put: {
      tags: ["Admin"],
      summary:
        "Set the order of ALL children of one parent (null = roots): sortOrder = index",
      security: bearer,
      requestBody: body(C.reorderCategoriesSchema.body),
      responses: {
        200: { description: "Category[]" },
        422: { description: "VALIDATION_ERROR" },
        ...std,
      },
    },
  },
  "/admin/categories/{id}": {
    patch: {
      tags: ["Admin"],
      summary:
        "Rename / move (parentId) / toggle / re-image. A move rewrites descendants' ancestors and products' categoryPath. Cycles are 422 (path parentId)",
      security: bearer,
      parameters: [id],
      requestBody: body(C.updateCategorySchema.body),
      responses: {
        200: { description: "Category" },
        404: { description: "NOT_FOUND" },
        422: { description: "VALIDATION_ERROR" },
        ...std,
      },
    },
    delete: {
      tags: ["Admin"],
      summary: "Delete an EMPTY category",
      security: bearer,
      parameters: [id],
      responses: {
        204: { description: "Deleted" },
        409: { description: "CATEGORY_NOT_EMPTY" },
        ...std,
      },
    },
  },
  "/admin/brands": {
    get: {
      tags: ["Admin"],
      summary:
        "Managed brand list with product counts (brands used by products are backfilled)",
      security: bearer,
      parameters: queryParams(C.listAdminBrandsSchema.query),
      responses: { 200: { description: "Brand[]" }, ...std },
    },
    post: {
      tags: ["Admin"],
      summary: "Create a brand (case-insensitive unique)",
      security: bearer,
      requestBody: body(C.createBrandSchema.body),
      responses: {
        201: { description: "Brand" },
        409: { description: "BRAND_EXISTS" },
        ...std,
      },
    },
  },
  "/admin/brands/{id}": {
    patch: {
      tags: ["Admin"],
      summary: "Rename (rewrites Product.brand on its products) or change the logo",
      security: bearer,
      parameters: [id],
      requestBody: body(C.updateBrandSchema.body),
      responses: {
        200: { description: "Brand" },
        409: { description: "BRAND_EXISTS" },
        ...std,
      },
    },
    delete: {
      tags: ["Admin"],
      summary: "Delete an unused brand",
      security: bearer,
      parameters: [id],
      responses: {
        204: { description: "Deleted" },
        409: { description: "BRAND_IN_USE" },
        ...std,
      },
    },
  },
  "/admin/users": {
    get: {
      tags: ["Admin"],
      summary: "Users table: search name/email, role, isActive, sort, paginate (admin)",
      security: bearer,
      parameters: queryParams(U.listUsersSchema.query),
      responses: { 200: { description: "User[] + page meta" }, ...std },
    },
  },
  "/admin/users/{id}": {
    get: {
      tags: ["Admin"],
      summary: "One user",
      security: bearer,
      parameters: [id],
      responses: {
        200: { description: "User" },
        404: { description: "NOT_FOUND" },
        ...std,
      },
    },
  },
  "/admin/users/{id}/role": {
    patch: {
      tags: ["Admin"],
      summary:
        "Change role. Revokes the user's refresh tokens (next login carries the new role). Not on yourself. Audited",
      security: bearer,
      parameters: [id],
      requestBody: body(U.changeRoleSchema.body),
      responses: {
        200: { description: "User" },
        409: { description: "SELF_MODIFICATION" },
        ...std,
      },
    },
  },
  "/admin/users/{id}/status": {
    patch: {
      tags: ["Admin"],
      summary:
        "Deactivate / reactivate. Deactivating revokes refresh tokens; login is 403. Not on yourself. Audited",
      security: bearer,
      parameters: [id],
      requestBody: body(U.changeStatusSchema.body),
      responses: {
        200: { description: "User" },
        409: { description: "SELF_MODIFICATION" },
        ...std,
      },
    },
  },
}
