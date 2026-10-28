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
import { applyCouponSchema, createCouponSchema } from "./modules/coupons/coupon.schema.js"
import { createDealSchema, listDealsSchema } from "./modules/deals/deal.schema.js"
import { createBannerSchema } from "./modules/banners/banner.routes.js"
import {
  adminReturnDecisionSchema,
  adminReturnRefundSchema,
  adminReturnsSchema,
  adminStatusSchema,
  cancelOrderSchema,
  listOrdersSchema,
  placeOrderSchema,
  returnOrderSchema,
} from "./modules/orders/order.schema.js"
import {
  createPaymentOrderSchema,
  listPaymentsSchema,
  mockPaySchema,
  refundSchema,
  simulateWebhookSchema,
  verifyPaymentSchema,
} from "./modules/payments/payment.schema.js"
import * as RS from "./modules/reviews/review.schema.js"
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
    "/cart/coupon": {
      post: {
        tags: ["Coupons"],
        summary:
          "Apply a coupon to the signed-in user's cart (replaces any earlier one). Cart view gains coupon { code, description, discount } and totals.discount/shipping/tax/total",
        security: bearer,
        requestBody: body(applyCouponSchema.body),
        responses: {
          200: { description: "Cart view" },
          401: { description: "UNAUTHORIZED (guests must sign in)" },
          422: {
            description:
              "COUPON_INVALID, details.reason: UNKNOWN | NOT_STARTED | EXPIRED | MIN_ORDER (+minOrder, shortBy) | ALREADY_USED | NOT_APPLICABLE | EXHAUSTED | FIRST_ORDER_ONLY | EMPTY_CART",
          },
        },
      },
      delete: {
        tags: ["Coupons"],
        summary: "Remove the applied coupon (idempotent)",
        security: bearer,
        responses: { 200: { description: "Cart view" } },
      },
    },
    "/coupons/available": {
      get: {
        tags: ["Coupons"],
        summary:
          "Live coupons, each checked against this cart: { code, description, type, value, maxDiscount, minOrder, expiresAt, applicable, discount, reason, message }",
        security: [...bearer, {}],
        parameters: [cartToken],
        responses: { 200: { description: "Coupon[]" } },
      },
    },
    "/deals": {
      get: {
        tags: ["Deals"],
        summary:
          "Flash sales / deals. status=active (default) or upcoming; category slug filter. meta.now is the server clock. Each deal: { id, dealPrice, startsAt, endsAt, stockLimit, claimed, remaining, badge, discountPercent, product }",
        parameters: queryParams(listDealsSchema.query as z.ZodObject),
        responses: { 200: { description: "Deal[] + meta { now, count }" } },
      },
    },
    "/time": {
      get: {
        tags: ["Deals"],
        summary:
          "Server clock { now, epochMs } (no-store). Clients keep the offset for countdowns",
        responses: { 200: { description: "{ now, epochMs }" } },
      },
    },
    "/banners": {
      get: {
        tags: ["Banners"],
        summary: "Active home banners (placement=hero|strip), ordered",
        parameters: [
          {
            name: "placement",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["hero", "strip"] },
          },
        ],
        responses: {
          200: { description: "{ id, title, subtitle, imageUrl, linkUrl, placement }[]" },
        },
      },
    },
    "/admin/coupons": {
      get: {
        tags: ["Admin"],
        summary: "All coupons",
        security: bearer,
        responses: { 200: { description: "Coupon[]" } },
      },
      post: {
        tags: ["Admin"],
        summary: "Create a coupon",
        security: bearer,
        requestBody: body(createCouponSchema.body),
        responses: {
          201: { description: "Coupon" },
          403: { description: "FORBIDDEN" },
          409: { description: "COUPON_CODE_TAKEN" },
          422: { description: "VALIDATION_ERROR" },
        },
      },
    },
    "/admin/coupons/{id}": {
      patch: {
        tags: ["Admin"],
        summary: "Edit / deactivate a coupon",
        security: bearer,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "Coupon" }, 404: { description: "NOT_FOUND" } },
      },
    },
    "/admin/deals": {
      get: {
        tags: ["Admin"],
        summary: "All deals",
        security: bearer,
        responses: { 200: { description: "Deal[]" } },
      },
      post: {
        tags: ["Admin"],
        summary: "Create a deal (price must be below the regular price)",
        security: bearer,
        requestBody: body(createDealSchema.body),
        responses: {
          201: { description: "Deal" },
          400: { description: "BAD_REQUEST" },
          403: { description: "FORBIDDEN" },
          422: { description: "VALIDATION_ERROR" },
        },
      },
    },
    "/admin/deals/{id}": {
      patch: {
        tags: ["Admin"],
        summary: "Edit a deal",
        security: bearer,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "Deal" } },
      },
      delete: {
        tags: ["Admin"],
        summary: "Delete a deal",
        security: bearer,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 204: { description: "Deleted" } },
      },
    },
    "/admin/banners": {
      get: {
        tags: ["Admin"],
        summary: "All banners",
        security: bearer,
        responses: { 200: { description: "Banner[]" } },
      },
      post: {
        tags: ["Admin"],
        summary: "Create a banner (linkUrl must be a same-site path)",
        security: bearer,
        requestBody: body(createBannerSchema.body),
        responses: {
          201: { description: "Banner" },
          422: { description: "VALIDATION_ERROR" },
        },
      },
    },
    "/admin/banners/{id}": {
      patch: {
        tags: ["Admin"],
        summary: "Edit a banner",
        security: bearer,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "Banner" } },
      },
      delete: {
        tags: ["Admin"],
        summary: "Delete a banner",
        security: bearer,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 204: { description: "Deleted" } },
      },
    },
    "/orders": {
      post: {
        tags: ["Orders"],
        summary:
          "Place an order from the cart, in ONE transaction (re-price, reserve stock, claim deal units, redeem coupon, empty cart). COD starts as placed, razorpay as pending_payment. Idempotent per Idempotency-Key header",
        security: bearer,
        parameters: [
          {
            name: "Idempotency-Key",
            in: "header",
            required: true,
            description:
              "Client-generated id (crypto.randomUUID()), one per checkout attempt. A retry returns the first order (200 + Idempotent-Replayed: true)",
            schema: { type: "string" },
          },
        ],
        requestBody: body(placeOrderSchema.body),
        responses: {
          201: { description: "Order" },
          200: { description: "Replay of an earlier request with the same key" },
          400: { description: "IDEMPOTENCY_KEY_REQUIRED" },
          404: { description: "NOT_FOUND (address)" },
          409: {
            description:
              "INSUFFICIENT_STOCK { items:[{productId,name,requested,availableQty}] } | PRICE_CHANGED { expectedTotal, actualTotal }",
          },
          422: {
            description:
              "VALIDATION_ERROR | CART_EMPTY | PINCODE_UNSERVICEABLE | COD_NOT_AVAILABLE | COUPON_INVALID | IDEMPOTENCY_KEY_REUSED",
          },
        },
      },
      get: {
        tags: ["Orders"],
        summary: "My orders, newest first. Filters: status, search (order number)",
        security: bearer,
        parameters: queryParams(listOrdersSchema.query as z.ZodObject),
        responses: { 200: { description: "Order[] + page meta" } },
      },
    },
    "/orders/{id}": {
      get: {
        tags: ["Orders"],
        summary:
          "One of my orders (status, statusHistory, pricing, addressSnapshot, items snapshot). Someone else's id is 404",
        security: bearer,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "Order" }, 404: { description: "NOT_FOUND" } },
      },
    },
    "/orders/{id}/cancel": {
      post: {
        tags: ["Orders"],
        summary:
          "Cancel (only pending_payment or placed). Releases stock, deal claim and coupon use",
        security: bearer,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: body(cancelOrderSchema.body),
        responses: {
          200: { description: "Order" },
          409: { description: "INVALID_TRANSITION" },
        },
      },
    },
    "/orders/{id}/return": {
      post: {
        tags: ["Orders"],
        summary:
          "Request a return (delivered orders, within 7 days of delivery): reason, optional items+qty (default all, never more than bought), photos (own uploads, max 4), pickupAddressId. The refund amount is computed server-side. 422 details paths: items.N.qty, items.N.productId, photos.N",
        security: bearer,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: body(returnOrderSchema.body),
        responses: {
          200: { description: "Order (return_requested)" },
          409: { description: "INVALID_TRANSITION | RETURN_WINDOW_CLOSED" },
          422: { description: "VALIDATION_ERROR" },
        },
      },
    },
    "/orders/{id}/invoice": {
      get: {
        tags: ["Orders"],
        summary:
          "Invoice PDF (attachment). Bearer is required, so download with fetch + blob, not a plain link",
        security: bearer,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "application/pdf" },
          409: { description: "INVOICE_NOT_AVAILABLE (pending_payment / cancelled)" },
          404: { description: "NOT_FOUND" },
        },
      },
    },
    "/admin/orders": {
      get: {
        tags: ["Admin"],
        summary: "All orders (same filters as /orders)",
        security: bearer,
        parameters: queryParams(listOrdersSchema.query as z.ZodObject),
        responses: { 200: { description: "Order[]" }, 403: { description: "FORBIDDEN" } },
      },
    },
    "/admin/orders/{id}/status": {
      post: {
        tags: ["Admin"],
        summary:
          "Move an order along the state machine (placed > packed > shipped > out_for_delivery > delivered; return_requested > returned > refunded)",
        security: bearer,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: body(adminStatusSchema.body),
        responses: {
          200: { description: "Order" },
          409: { description: "INVALID_TRANSITION { status, allowed }" },
        },
      },
    },
    "/payments/config": {
      get: {
        tags: ["Payments"],
        summary:
          "Which gateway is active: { configured, provider: razorpay|mock|null, keyId (public), mock }",
        responses: { 200: { description: "Gateway config" } },
      },
    },
    "/payments/create-order": {
      post: {
        tags: ["Payments"],
        summary:
          "Step 1 of paying a pending_payment order online: returns what checkout.js needs { providerOrderId, keyId, amount (paise), currency, prefill }. Idempotent: a retry gets the same provider order",
        security: bearer,
        requestBody: body(createPaymentOrderSchema.body),
        responses: {
          200: { description: "Checkout options" },
          404: { description: "NOT_FOUND (also another user's order)" },
          409: { description: "NOT_ONLINE_PAYMENT | ORDER_NOT_PAYABLE" },
          503: { description: "PAYMENTS_NOT_CONFIGURED" },
        },
      },
    },
    "/payments/verify": {
      post: {
        tags: ["Payments"],
        summary:
          "Send the checkout handler's razorpay_* fields. The HMAC-SHA256 signature is verified with the secret; on success the order moves pending_payment > placed. Webhooks stay the source of truth: this call and the webhook are both idempotent",
        security: bearer,
        requestBody: body(verifyPaymentSchema.body),
        responses: {
          200: { description: "Order" },
          400: { description: "SIGNATURE_MISMATCH | ORDER_MISMATCH" },
          404: { description: "NOT_FOUND" },
        },
      },
    },
    "/payments/webhook": {
      post: {
        tags: ["Payments"],
        summary:
          "Razorpay webhook (public; authenticated by x-razorpay-signature = HMAC of the RAW body). payment.captured / order.paid > paid, payment.failed > failed, refund.processed / refund.failed. Duplicate deliveries (x-razorpay-event-id) are no-ops",
        responses: {
          200: { description: "{ duplicate: boolean }" },
          400: { description: "INVALID_SIGNATURE" },
        },
      },
    },
    "/payments": {
      get: {
        tags: ["Payments"],
        summary: "My payments (history with refunds). Filters: status, orderId",
        security: bearer,
        parameters: queryParams(listPaymentsSchema.query as z.ZodObject),
        responses: { 200: { description: "Payment[] + page meta" } },
      },
    },
    "/payments/mock/pay": {
      post: {
        tags: ["Payments"],
        summary:
          "Mock gateway only (non-production): what the Razorpay modal does. outcome success returns the signed handler payload; success_no_callback = the tab closed after paying (webhook only); failure = card declined",
        security: bearer,
        requestBody: body(mockPaySchema.body),
        responses: {
          200: { description: "{ ok, handler | error }" },
          404: { description: "Mock not active" },
        },
      },
    },
    "/payments/dev/webhook": {
      post: {
        tags: ["Payments"],
        summary:
          "Non-production: fire a correctly SIGNED webhook for your order (works with real test keys when RAZORPAY_WEBHOOK_SECRET is set), since Razorpay cannot reach localhost",
        security: bearer,
        requestBody: body(simulateWebhookSchema.body),
        responses: { 200: { description: "{ duplicate }" } },
      },
    },
    "/admin/payments": {
      get: {
        tags: ["Admin"],
        summary: "All payments (same filters)",
        security: bearer,
        parameters: queryParams(listPaymentsSchema.query as z.ZodObject),
        responses: {
          200: { description: "Payment[]" },
          403: { description: "FORBIDDEN" },
        },
      },
    },
    "/admin/payments/{id}/refund": {
      post: {
        tags: ["Admin"],
        summary:
          "Refund (part of) a captured payment. Omit amount to refund everything left",
        security: bearer,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: body(refundSchema.body),
        responses: {
          200: { description: "Payment" },
          409: { description: "NOT_PAID | REFUND_EXCEEDS_PAYMENT { refundable }" },
        },
      },
    },
    "/products/{productId}/reviews/summary": {
      get: {
        tags: ["Reviews"],
        summary:
          "Rating summary from published reviews: { average, count, histogram: {1..5}, withPhotos }",
        parameters: [
          { name: "productId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "Summary" }, 404: { description: "NOT_FOUND" } },
      },
    },
    "/products/{productId}/reviews/eligibility": {
      get: {
        tags: ["Reviews"],
        summary:
          "Can I review this product? { canReview, reason: ALREADY_REVIEWED | OWN_PRODUCT | null, verifiedPurchase, review }",
        security: bearer,
        parameters: [
          { name: "productId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "Eligibility" } },
      },
    },
    "/products/{productId}/reviews": {
      get: {
        tags: ["Reviews"],
        summary:
          "Published reviews (public; send Bearer to get myVote/isMine). sort helpful|newest|highest|lowest, rating=1..5, photos=true",
        parameters: [
          { name: "productId", in: "path", required: true, schema: { type: "string" } },
          ...queryParams(RS.listReviewsSchema.query as z.ZodObject),
        ],
        responses: { 200: { description: "Review[] + page meta" } },
      },
      post: {
        tags: ["Reviews"],
        summary:
          "Write a review (one per user per product). verifiedPurchase is computed from delivered orders. Photos must be your own uploads (POST /uploads/images), max 5",
        security: bearer,
        parameters: [
          { name: "productId", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: body(RS.createReviewSchema.body),
        responses: {
          201: { description: "Review" },
          409: { description: "ALREADY_REVIEWED" },
          403: { description: "OWN_PRODUCT" },
          422: {
            description: "VALIDATION_ERROR (photos.N for a foreign/invalid photo url)",
          },
        },
      },
    },
    "/reviews/{id}": {
      patch: {
        tags: ["Reviews"],
        summary: "Edit my review (404 for anyone else's)",
        security: bearer,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: body(RS.updateReviewSchema.body),
        responses: { 200: { description: "Review" } },
      },
      delete: {
        tags: ["Reviews"],
        summary: "Delete my review (admins can delete any)",
        security: bearer,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 204: { description: "Deleted" } },
      },
    },
    "/reviews/{id}/helpful": {
      put: {
        tags: ["Reviews"],
        summary:
          "Mark helpful. Idempotent: voting twice = once. 403 OWN_CONTENT on your own review",
        security: bearer,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "{ helpfulCount, myVote }" } },
      },
      delete: {
        tags: ["Reviews"],
        summary: "Remove my helpful vote (idempotent)",
        security: bearer,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "{ helpfulCount, myVote }" } },
      },
    },
    "/reviews/{id}/report": {
      post: {
        tags: ["Reviews"],
        summary: "Report a review to moderators (one report per user)",
        security: bearer,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: body(RS.reportSchema.body),
        responses: { 200: { description: "{ reported, alreadyReported }" } },
      },
    },
    "/products/{productId}/questions": {
      get: {
        tags: ["Q&A"],
        summary:
          "Questions with their top 3 answers (seller/staff first, then most upvoted). sort helpful|newest",
        parameters: [
          { name: "productId", in: "path", required: true, schema: { type: "string" } },
          ...queryParams(RS.listQuestionsSchema.query as z.ZodObject),
        ],
        responses: { 200: { description: "Question[] + page meta" } },
      },
      post: {
        tags: ["Q&A"],
        summary: "Ask a question",
        security: bearer,
        parameters: [
          { name: "productId", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: body(RS.askSchema.body),
        responses: { 201: { description: "Question" } },
      },
    },
    "/questions/{id}/answers": {
      get: {
        tags: ["Q&A"],
        summary: "All answers of a question (paged)",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          ...queryParams(RS.listAnswersSchema.query as z.ZodObject),
        ],
        responses: { 200: { description: "Answer[] + page meta" } },
      },
      post: {
        tags: ["Q&A"],
        summary:
          "Answer. badge = seller (the product's seller) | staff (admin) | null; verifiedBuyer from delivered orders",
        security: bearer,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: body(RS.answerSchema.body),
        responses: { 201: { description: "Answer" } },
      },
    },
    "/questions/{id}/upvote": {
      put: {
        tags: ["Q&A"],
        summary: "Upvote a question (idempotent; 403 on your own)",
        security: bearer,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "{ upvotes, myVote }" } },
      },
      delete: {
        tags: ["Q&A"],
        summary: "Remove my upvote",
        security: bearer,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "{ upvotes, myVote }" } },
      },
    },
    "/answers/{id}/upvote": {
      put: {
        tags: ["Q&A"],
        summary: "Upvote an answer (idempotent; 403 on your own)",
        security: bearer,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "{ upvotes, myVote }" } },
      },
      delete: {
        tags: ["Q&A"],
        summary: "Remove my upvote",
        security: bearer,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "{ upvotes, myVote }" } },
      },
    },
    "/questions/{id}": {
      delete: {
        tags: ["Q&A"],
        summary: "Delete my question (and its answers); admin can delete any",
        security: bearer,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 204: { description: "Deleted" } },
      },
    },
    "/answers/{id}": {
      delete: {
        tags: ["Q&A"],
        summary: "Delete my answer; admin can delete any",
        security: bearer,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 204: { description: "Deleted" } },
      },
    },
    "/admin/reviews": {
      get: {
        tags: ["Admin"],
        summary:
          "Moderation queue. Filters: status, productId, reported=true (most reported first)",
        security: bearer,
        parameters: queryParams(RS.adminListReviewsSchema.query as z.ZodObject),
        responses: {
          200: { description: "Review[] (+ product, reportCount, moderationNote)" },
          403: { description: "FORBIDDEN" },
        },
      },
    },
    "/admin/reviews/{id}/moderate": {
      post: {
        tags: ["Admin"],
        summary:
          "Hide or republish a review; the product's rating is recomputed from published reviews",
        security: bearer,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: body(RS.moderateSchema.body),
        responses: { 200: { description: "Review" } },
      },
    },
    "/admin/questions": {
      get: {
        tags: ["Admin"],
        summary: "All questions (filter status)",
        security: bearer,
        parameters: queryParams(RS.adminListQuestionsSchema.query as z.ZodObject),
        responses: { 200: { description: "Question[]" } },
      },
    },
    "/admin/questions/{id}/moderate": {
      post: {
        tags: ["Admin"],
        summary: "Hide or republish a question",
        security: bearer,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: body(RS.moderateSchema.body),
        responses: { 200: { description: "{ id, kind, status }" } },
      },
    },
    "/admin/answers/{id}/moderate": {
      post: {
        tags: ["Admin"],
        summary: "Hide or republish an answer",
        security: bearer,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: body(RS.moderateSchema.body),
        responses: { 200: { description: "{ id, kind, status }" } },
      },
    },
    "/admin/returns": {
      get: {
        tags: ["Admin"],
        summary:
          "Returns queue (orders with a return request). Filter: status requested|approved|rejected|refunded",
        security: bearer,
        parameters: queryParams(adminReturnsSchema.query as z.ZodObject),
        responses: {
          200: { description: "Order[] (returnRequest populated)" },
          403: { description: "FORBIDDEN" },
        },
      },
    },
    "/admin/returns/{id}/decision": {
      post: {
        tags: ["Admin"],
        summary:
          "Approve (order -> returned, returned items restocked) or reject (order -> delivered)",
        security: bearer,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: body(adminReturnDecisionSchema.body),
        responses: {
          200: { description: "Order" },
          409: { description: "INVALID_TRANSITION" },
        },
      },
    },
    "/admin/returns/{id}/refund": {
      post: {
        tags: ["Admin"],
        summary:
          "Refund an approved return (order -> refunded). Online payments are refunded through the gateway for the returned items' share",
        security: bearer,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: body(adminReturnRefundSchema.body),
        responses: {
          200: { description: "Order" },
          409: { description: "INVALID_TRANSITION" },
        },
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
        summary: "Product detail (includes `deal`: the live deal or null)",
        parameters: [
          { name: "idOrSlug", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "Product" }, 404: { description: "NOT_FOUND" } },
      },
    },
  },
}
