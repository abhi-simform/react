import { z } from "zod"
import * as AN from "./modules/analytics/analytics.schema.js"

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
void body
void id

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
}
