import { z } from "zod"
import * as AN from "./modules/analytics/analytics.schema.js"
import * as SL from "./modules/sellers/seller.schema.js"
import { updateSettingsSchema } from "./modules/system/settings.service.js"

// B11 (analytics, seller applications, order ops, system) paths. Built from the same Zod schemas the routes use.
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

const analyticsPaths = (base: string, who: string, funnel: boolean) => ({
  [`${base}/overview`]: {
    get: {
      tags: ["Analytics"],
      summary: `KPIs for the range with the previous equal period for deltas, plus "needs attention" counts (${who})`,
      security: bearer,
      parameters: queryParams(AN.overviewSchema.query),
      responses: {
        200: {
          description:
            "{ range, revenue|orders|averageOrderValue|unitsSold|newCustomers: { value, previous, deltaPct }, attention }",
        },
        422: { description: "VALIDATION_ERROR (from after to)" },
        ...std,
      },
    },
  },
  [`${base}/revenue`]: {
    get: {
      tags: ["Analytics"],
      summary: `Revenue and order count per India calendar day, empty days zero-filled (${who})`,
      security: bearer,
      parameters: queryParams(AN.revenueSchema.query),
      responses: {
        200: { description: "{ range, total, points[{date,revenue,orders}] }" },
        ...std,
      },
    },
  },
  [`${base}/orders-by-status`]: {
    get: {
      tags: ["Analytics"],
      summary: `Orders per status in the range (${who})`,
      security: bearer,
      parameters: queryParams(AN.statusSchema.query),
      responses: { 200: { description: "{ status, count, amount }[]" }, ...std },
    },
  },
  [`${base}/top-products`]: {
    get: {
      tags: ["Analytics"],
      summary: `Best sellers by revenue or units (${who})`,
      security: bearer,
      parameters: queryParams(AN.topProductsSchema.query),
      responses: {
        200: { description: "{ productId, name, revenue, units, stock, ... }[]" },
        ...std,
      },
    },
  },
  [`${base}/category-share`]: {
    get: {
      tags: ["Analytics"],
      summary: `Revenue per top-level category (${who})`,
      security: bearer,
      parameters: queryParams(AN.categoryShareSchema.query),
      responses: {
        200: { description: "{ categoryId, name, revenue, sharePct }[]" },
        ...std,
      },
    },
  },
  [`${base}/low-stock`]: {
    get: {
      tags: ["Analytics"],
      summary: `Active products at or under the threshold (default: the lowStockThreshold setting) (${who})`,
      security: bearer,
      parameters: queryParams(AN.lowStockSchema.query),
      responses: { 200: { description: "{ threshold, total, items[] }" }, ...std },
    },
  },
  ...(funnel
    ? {
        [`${base}/funnel`]: {
          get: {
            tags: ["Analytics"],
            summary:
              "Distinct signed-in shoppers: viewed, had a cart, started checkout, paid (platform-wide)",
            security: bearer,
            parameters: queryParams(AN.funnelSchema.query),
            responses: {
              200: {
                description: "{ range, steps[{key,label,count,ofPrevious,ofFirst}] }",
              },
              ...std,
            },
          },
        },
      }
    : {}),
})

export const b11Paths = {
  ...analyticsPaths("/admin/analytics", "admin", true),
  ...analyticsPaths("/seller/analytics", "seller: own products and lines only", false),
  "/me/spending": {
    get: {
      tags: ["Analytics"],
      summary:
        "The signed-in shopper's spending per month (sold orders only), zero-filled",
      security: bearer,
      parameters: queryParams(AN.spendingSchema.query),
      responses: {
        200: { description: "{ months, total, orders, points[{month,spent,orders}] }" },
        401: std[401],
      },
    },
  },
  "/seller-applications": {
    post: {
      tags: ["Sellers"],
      summary: "A signed-in customer applies to sell (one pending application at a time)",
      security: bearer,
      requestBody: body(SL.applySchema.body),
      responses: {
        201: { description: "SellerApplication (status pending)" },
        409: { description: "APPLICATION_PENDING | ALREADY_SELLER" },
        422: { description: "VALIDATION_ERROR" },
        401: std[401],
      },
    },
  },
  "/seller-applications/mine": {
    get: {
      tags: ["Sellers"],
      summary: "My latest application (or null): the account page shows its status",
      security: bearer,
      responses: { 200: { description: "SellerApplication | null" }, 401: std[401] },
    },
  },
  "/admin/seller-applications": {
    get: {
      tags: ["Admin"],
      summary: "Applications to review (status filter, pending = oldest first)",
      security: bearer,
      parameters: queryParams(SL.listApplicationsSchema.query),
      responses: { 200: { description: "SellerApplication[] + page meta" }, ...std },
    },
  },
  "/admin/seller-applications/{id}/decision": {
    post: {
      tags: ["Admin"],
      summary:
        "Approve (role becomes seller, refresh tokens revoked, applicant notified) or reject (note required). Decides once. Audited",
      security: bearer,
      parameters: [id],
      requestBody: body(SL.decisionSchema.body),
      responses: {
        200: { description: "SellerApplication" },
        404: { description: "NOT_FOUND" },
        409: { description: "ALREADY_REVIEWED" },
        422: { description: "VALIDATION_ERROR (reject without a note)" },
        ...std,
      },
    },
  },
  "/admin/sellers/{id}": {
    get: {
      tags: ["Admin"],
      summary:
        "Seller detail: profile, catalog counts by status, sales numbers, latest application",
      security: bearer,
      parameters: [id],
      responses: {
        200: { description: "SellerDetail" },
        404: { description: "NOT_FOUND (not a seller)" },
        ...std,
      },
    },
  },
  "/admin/system/health": {
    get: {
      tags: ["Admin"],
      summary:
        "Dependency checks (MongoDB, Redis, payments, email, jobs), process facts, cache stats",
      security: bearer,
      responses: { 200: { description: "{ status, checks[], process, cache }" }, ...std },
    },
  },
  "/admin/system/settings": {
    get: {
      tags: ["Admin"],
      summary:
        "Editable platform settings plus the read-only values the platform runs with",
      security: bearer,
      responses: { 200: { description: "{ editable, readOnly }" }, ...std },
    },
    patch: {
      tags: ["Admin"],
      summary: "Update editable settings (partial). Audited with before/after",
      security: bearer,
      requestBody: body(updateSettingsSchema.body),
      responses: {
        200: { description: "Settings" },
        422: { description: "VALIDATION_ERROR" },
        ...std,
      },
    },
  },
}
