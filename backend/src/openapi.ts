import { z } from "zod"
import { registerSchema, loginSchema } from "./modules/auth/auth.schema.js"
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
    "/categories": {
      get: {
        tags: ["Catalog"],
        summary: "Category tree",
        responses: { 200: { description: "Category[] with children" } },
      },
    },
    "/products": {
      get: {
        tags: ["Catalog"],
        summary: "Search / filter / sort / paginate",
        parameters: queryParams(productQuery),
        responses: {
          200: {
            description: "Product[] + meta(page,limit,total,totalPages,hasNext,hasPrev)",
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
