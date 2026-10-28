import { z } from "zod"
import { registerSchema, loginSchema } from "./modules/auth/auth.schema.js"
import {
  createAddressSchema,
  updateAddressSchema,
} from "./modules/addresses/address.schema.js"
import { addWishlistSchema } from "./modules/wishlist/wishlist.schema.js"
import { listBrandsSchema } from "./modules/categories/category.schema.js"
import { listProductsSchema } from "./modules/products/product.schema.js"

// OpenAPI doc served at /api/docs. Request schemas are derived from the SAME Zod schemas used
// for validation, so docs can't drift from behaviour. Extend as modules are added.
const json = (schema: z.ZodType) =>
  z.toJSONSchema(schema, { io: "input", unrepresentable: "any" })
const body = (schema: z.ZodType) => ({
  required: true,
  content: { "application/json": { schema: json(schema) } },
})
const queryParams = (schema: z.ZodObject) =>
  Object.entries(json(schema).properties as Record<string, object>).map(([name, s]) => ({
    name,
    in: "query",
    required: false,
    schema: s,
  }))

const bearer = [{ bearerAuth: [] }]
const brandQuery = listBrandsSchema.query as z.ZodObject
const productQuery = listProductsSchema.query as z.ZodObject

export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "ShopSphere API",
    version: "0.1.0",
    description:
      "Responses use { success, data, meta? } or { success:false, error:{code,message,details?} }.",
  },
  servers: [{ url: "/api/v1" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Liveness + DB status",
        responses: { 200: { description: "ok" } },
      },
    },
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Create account (sets refresh cookie)",
        requestBody: body(registerSchema.body),
        responses: {
          201: { description: "{ user, accessToken }" },
          409: { description: "EMAIL_TAKEN" },
          422: { description: "VALIDATION_ERROR" },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Sign in (sets refresh cookie)",
        requestBody: body(loginSchema.body),
        responses: {
          200: { description: "{ user, accessToken }" },
          401: { description: "INVALID_CREDENTIALS" },
        },
      },
    },
    "/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Rotate refresh cookie, get a new access token",
        responses: {
          200: { description: "{ user, accessToken }" },
          401: { description: "No/invalid/reused refresh token" },
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Revoke session + clear cookie",
        responses: { 204: { description: "No content" } },
      },
    },
    "/auth/verify-email": {
      post: {
        tags: ["Auth"],
        summary: "Verify email with emailed token",
        responses: { 200: { description: "ok" } },
      },
    },
    "/auth/forgot-password": {
      post: {
        tags: ["Auth"],
        summary: "Email a reset link (always 200)",
        responses: { 200: { description: "ok" } },
      },
    },
    "/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary: "Set a new password using the emailed token",
        responses: { 200: { description: "ok" } },
      },
    },
    "/users/me": {
      get: {
        tags: ["Users"],
        summary: "Current user",
        security: bearer,
        responses: { 200: { description: "User" }, 401: { description: "Unauthorized" } },
      },
      patch: {
        tags: ["Users"],
        summary: "Update profile",
        security: bearer,
        responses: { 200: { description: "User" } },
      },
    },
    "/wishlist": {
      get: {
        tags: ["Wishlist"],
        summary: "Wishlisted products (card shape, newest first) + page meta",
        security: bearer,
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", maximum: 60 } },
        ],
        responses: {
          200: { description: "Product[] with wishlistedAt" },
          401: { description: "Unauthorized" },
        },
      },
      post: {
        tags: ["Wishlist"],
        summary: "Add a product. Idempotent: 201 first time, 200 if already there",
        security: bearer,
        requestBody: body(addWishlistSchema.body),
        responses: {
          201: { description: "{ productId }" },
          200: { description: "Already wishlisted" },
          404: { description: "NOT_FOUND (unknown or inactive product)" },
          422: { description: "VALIDATION_ERROR" },
        },
      },
    },
    "/wishlist/ids": {
      get: {
        tags: ["Wishlist"],
        summary: "Only the wishlisted product ids (cheap; paint all hearts)",
        security: bearer,
        responses: { 200: { description: "string[]" } },
      },
    },
    "/wishlist/{productId}": {
      delete: {
        tags: ["Wishlist"],
        summary: "Remove a product. Idempotent: 204 even if it was not wishlisted",
        security: bearer,
        parameters: [
          { name: "productId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          204: { description: "No content" },
          422: { description: "Invalid id" },
        },
      },
    },
    "/addresses": {
      get: {
        tags: ["Addresses"],
        summary: "My addresses, default first",
        security: bearer,
        responses: {
          200: { description: "Address[]" },
          401: { description: "Unauthorized" },
        },
      },
      post: {
        tags: ["Addresses"],
        summary:
          "Create. First address is always default; isDefault:true demotes the old default",
        security: bearer,
        requestBody: body(createAddressSchema.body),
        responses: {
          201: { description: "Address" },
          409: { description: "ADDRESS_LIMIT (max 10)" },
          422: { description: "VALIDATION_ERROR (incl. unserviceable pincode)" },
        },
      },
    },
    "/addresses/{id}": {
      patch: {
        tags: ["Addresses"],
        summary: "Partial update (the default flag has its own endpoint)",
        security: bearer,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: body(updateAddressSchema.body),
        responses: {
          200: { description: "Address" },
          404: { description: "NOT_FOUND (also for other users' addresses)" },
          422: { description: "VALIDATION_ERROR" },
        },
      },
      delete: {
        tags: ["Addresses"],
        summary:
          "Delete. Deleting the default auto-promotes the newest remaining address",
        security: bearer,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "{ deletedId, newDefaultId | null }" },
          404: { description: "NOT_FOUND" },
        },
      },
    },
    "/addresses/{id}/default": {
      post: {
        tags: ["Addresses"],
        summary: "Make this the default (atomically demotes the previous one)",
        security: bearer,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "Address" }, 404: { description: "NOT_FOUND" } },
      },
    },
    "/pincodes/{pincode}": {
      get: {
        tags: ["Delivery"],
        summary: "Serviceability + delivery estimate for a 6-digit pincode (public)",
        parameters: [
          {
            name: "pincode",
            in: "path",
            required: true,
            schema: { type: "string", pattern: "^[1-9][0-9]{5}$" },
          },
        ],
        responses: {
          200: {
            description:
              "{ serviceable, zone, state, codAvailable, deliveryDays:{min,max}, estimatedDelivery:{from,to} } or { serviceable:false }",
          },
          422: { description: "VALIDATION_ERROR" },
        },
      },
    },
    "/categories": {
      get: {
        tags: ["Catalog"],
        summary: "Category tree (each node has productCount for its whole subtree)",
        responses: { 200: { description: "CategoryNode[] with children" } },
      },
    },
    "/categories/{slug}": {
      get: {
        tags: ["Catalog"],
        summary:
          "Category detail: breadcrumb ancestors (root -> parent), children, productCount",
        parameters: [
          { name: "slug", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Category" },
          404: { description: "NOT_FOUND" },
        },
      },
    },
    "/brands": {
      get: {
        tags: ["Catalog"],
        summary:
          "Brands with active-product counts, optionally within a category subtree",
        parameters: queryParams(brandQuery),
        responses: { 200: { description: "{ name, count }[] sorted by name" } },
      },
    },
    "/products": {
      get: {
        tags: ["Catalog"],
        summary: "Search / filter / sort / paginate",
        parameters: queryParams(productQuery),
        responses: {
          200: {
            description:
              "Product[] + meta(page,limit,total,totalPages,hasNext,hasPrev). With facets=true, meta.facets = { brands:[{value,count}], price:{min,max}, rating:[{value,count}], inStock:{count} }; each facet ignores its own filter (disjunctive).",
          },
        },
      },
    },
    "/products/{idOrSlug}": {
      get: {
        tags: ["Catalog"],
        summary: "Product detail",
        parameters: [
          { name: "idOrSlug", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "Product" }, 404: { description: "NOT_FOUND" } },
      },
    },
  },
}
