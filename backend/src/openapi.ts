import { z } from "zod"
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "./modules/auth/auth.schema.js"
import {
  createAddressSchema,
  updateAddressSchema,
} from "./modules/addresses/address.schema.js"
import {
  addItemSchema,
  mergeSchema,
  updateItemSchema,
} from "./modules/cart/cart.schema.js"
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
const cartToken = {
  name: "x-cart-token",
  in: "header",
  required: false,
  description:
    "Guest cart id (client-generated, 16-64 url-safe chars). Ignored when Bearer is sent",
  schema: { type: "string" },
}
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
        summary:
          "Verify email with the emailed token (idempotent: a repeat says alreadyVerified)",
        requestBody: body(verifyEmailSchema.body),
        responses: {
          200: { description: "{ message, alreadyVerified }" },
          400: { description: "INVALID_TOKEN | TOKEN_EXPIRED" },
        },
      },
    },
    "/auth/resend-verification": {
      post: {
        tags: ["Auth"],
        summary: "Email a new verification link (60 s cooldown)",
        security: bearer,
        responses: {
          200: { description: "ok" },
          409: { description: "ALREADY_VERIFIED" },
          429: { description: "RESEND_COOLDOWN, details.retryAfterSeconds" },
        },
      },
    },
    "/auth/forgot-password": {
      post: {
        tags: ["Auth"],
        summary:
          "Email a reset link (always the same 200, whether or not the email exists)",
        requestBody: body(forgotPasswordSchema.body),
        responses: { 200: { description: "ok" } },
      },
    },
    "/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary: "Set a new password with the emailed token; revokes every session",
        requestBody: body(resetPasswordSchema.body),
        responses: {
          200: { description: "ok" },
          400: { description: "INVALID_TOKEN | TOKEN_EXPIRED" },
          422: { description: "VALIDATION_ERROR (password rules)" },
        },
      },
    },
    "/auth/change-password": {
      post: {
        tags: ["Auth"],
        summary: "Change password; other sessions are revoked, this one stays",
        security: bearer,
        requestBody: body(changePasswordSchema.body),
        responses: {
          200: { description: "ok" },
          401: { description: "INVALID_CREDENTIALS (wrong current password)" },
          409: { description: "NO_PASSWORD (Google-only account)" },
        },
      },
    },
    "/auth/sessions": {
      get: {
        tags: ["Auth"],
        summary:
          "Active sessions of the caller; `current` marks the one whose cookie was sent",
        security: bearer,
        responses: {
          200: {
            description:
              "[{ id, device, userAgent, ip, startedAt, lastActiveAt, current }]",
          },
        },
      },
    },
    "/auth/sessions/{id}": {
      delete: {
        tags: ["Auth"],
        summary:
          "Revoke one session (its next refresh fails). Revoking the current one clears the cookie",
        security: bearer,
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          204: { description: "revoked" },
          404: { description: "Not your session" },
        },
      },
    },
    "/auth/logout-all": {
      post: {
        tags: ["Auth"],
        summary: "Revoke every session including this one",
        security: bearer,
        responses: { 204: { description: "No content" } },
      },
    },
    "/auth/google": {
      get: {
        tags: ["Auth"],
        summary: "Start Google sign-in (browser navigation). ?redirect=/relative/path",
        description:
          "302 to Google (or to the built-in mock consent page when no credentials are set outside production). Sets a short-lived httpOnly state cookie.",
        parameters: [
          { name: "redirect", in: "query", required: false, schema: { type: "string" } },
        ],
        responses: { 302: { description: "Redirect" } },
      },
    },
    "/auth/google/callback": {
      get: {
        tags: ["Auth"],
        summary:
          "Google redirects here. Sets the refresh cookie, then 302 to CLIENT_URL/auth/google/callback",
        description:
          "Success: ?redirect=/path[&created=1][&linked=1]. Failure: ?error=access_denied|invalid_state|email_not_verified|account_disabled|google_failed|google_not_configured.",
        responses: { 302: { description: "Redirect to the SPA" } },
      },
    },
    "/seller/me": {
      get: {
        tags: ["Seller"],
        summary: "Role-gated placeholder (seller/admin only); the real seller API is B11",
        security: bearer,
        responses: {
          200: { description: "{ sellerId, role, productCount }" },
          401: { description: "Unauthorized" },
          403: { description: "FORBIDDEN (customer)" },
        },
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
    "/cart": {
      get: {
        tags: ["Cart"],
        summary:
          "The cart: { items, saved, totals, hasIssues }. Lines carry availableQty, outOfStock, qtyReduced, priceChanged/previousPrice. Identify with Bearer OR x-cart-token",
        security: [...bearer, {}],
        parameters: [cartToken],
        responses: {
          200: {
            description: "Cart view (an unknown guest token is just an empty cart)",
          },
          400: { description: "CART_TOKEN_REQUIRED" },
          401: { description: "Invalid/expired Bearer token" },
        },
      },
      delete: {
        tags: ["Cart"],
        summary: "Empty the cart (saved lines too)",
        security: [...bearer, {}],
        parameters: [cartToken],
        responses: { 200: { description: "Empty cart view" } },
      },
    },
    "/cart/items": {
      post: {
        tags: ["Cart"],
        summary:
          "Add qty (default 1). Existing line: quantities add up. Max min(stock, 10) per line",
        security: [...bearer, {}],
        parameters: [cartToken],
        requestBody: body(addItemSchema.body),
        responses: {
          201: { description: "Cart view" },
          404: { description: "NOT_FOUND (unknown or inactive product)" },
          409: {
            description:
              "INSUFFICIENT_STOCK { availableQty, requested, inCart } | CART_FULL (50 lines)",
          },
          422: { description: "VALIDATION_ERROR" },
        },
      },
    },
    "/cart/items/{productId}": {
      patch: {
        tags: ["Cart"],
        summary:
          "Set qty and/or move between cart and saved-for-later (savedForLater: true|false)",
        security: [...bearer, {}],
        parameters: [
          cartToken,
          { name: "productId", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: body(updateItemSchema.body),
        responses: {
          200: { description: "Cart view" },
          404: { description: "Not in this cart" },
          409: { description: "INSUFFICIENT_STOCK" },
          422: { description: "VALIDATION_ERROR" },
        },
      },
      delete: {
        tags: ["Cart"],
        summary: "Remove a line (idempotent)",
        security: [...bearer, {}],
        parameters: [
          cartToken,
          { name: "productId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "Cart view" } },
      },
    },
    "/cart/acknowledge-prices": {
      post: {
        tags: ["Cart"],
        summary: "Accept today's prices: clears every priceChanged flag",
        security: [...bearer, {}],
        parameters: [cartToken],
        responses: { 200: { description: "Cart view" } },
      },
    },
    "/cart/merge": {
      post: {
        tags: ["Cart"],
        summary:
          "After login: fold the guest cart (x-cart-token value in the body) into the user's cart, then delete it. Quantities add up, capped by stock",
        security: bearer,
        requestBody: body(mergeSchema.body),
        responses: {
          200: {
            description:
              "Cart view + merge { merged, adjusted: [{productId,name,requested,applied}], skipped: [{productId,name,reason}] }",
          },
          401: { description: "Unauthorized" },
          422: { description: "VALIDATION_ERROR" },
        },
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
    "/uploads/images": {
      post: {
        tags: ["Uploads"],
        summary:
          "Upload one image (multipart field `file`). JPEG/PNG/WebP by magic bytes, max UPLOAD_MAX_BYTES (2 MB)",
        security: bearer,
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file"],
                properties: { file: { type: "string", format: "binary" } },
              },
            },
          },
        },
        responses: {
          201: {
            description: "{ key, url, contentType, bytes }; `url` is absolute and public",
          },
          401: { description: "UNAUTHORIZED" },
          413: { description: "FILE_TOO_LARGE" },
          415: {
            description: "UNSUPPORTED_FILE_TYPE (checked on the bytes, not the name)",
          },
          422: { description: "VALIDATION_ERROR (no file / more than one file)" },
          429: { description: "UPLOAD_RATE_LIMITED" },
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
