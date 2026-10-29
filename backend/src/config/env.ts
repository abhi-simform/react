import { z } from "zod"

import { productionConfigProblems } from "./prodChecks.js"

// Validate environment ONCE at boot. A bad/missing variable crashes the process with a
// readable message instead of causing a confusing failure later at 2 a.m.
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:5173")
    .transform((v) =>
      v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  CLIENT_URL: z.url().default("http://localhost:5173"),

  JWT_ACCESS_SECRET: z.string().min(32, "must be at least 32 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),
  COOKIE_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  // Optional (14.2). Empty = a host-only cookie (only the API's own host gets it): right when the frontend is on a
  // sibling subdomain (same-site). Set `.example.com` only if ANOTHER subdomain must read the cookie too.
  COOKIE_DOMAIN: z.string().optional(),

  // Google sign-in (B10). Without GOOGLE_CLIENT_ID the backend falls back to a built-in MOCK
  // Google (a local consent page) outside production, so the flow works with no credentials.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z
    .url()
    .default("http://localhost:4000/api/v1/auth/google/callback"),
  GOOGLE_MOCK: z.enum(["auto", "true", "false"]).default("auto"),

  // Payments (B6). Without RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET the backend falls back to a built-in
  // MOCK gateway outside production, so the whole pay flow runs locally with no account.
  // Real test mode: see backend/docs/API-CONVENTIONS.md "Payments (B6)".
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  PAYMENT_MOCK: z.enum(["auto", "true", "false"]).default("auto"),
  // The mock gateway delivers its "webhook" this long after the browser callback (0 in tests).
  MOCK_WEBHOOK_DELAY_MS: z.coerce.number().int().min(0).default(1500),

  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().int().default(1025),
  // Production SMTP providers need a login, and implicit TLS on port 465 (587 = STARTTLS, leave `false`).
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  EMAIL_FROM: z.string().default("ShopSphere <no-reply@shopsphere.local>"),

  // Image uploads (B7). Local disk for development; the ImageStorage interface in
  // modules/uploads/storage.ts is where a Cloudinary/S3 adapter plugs in later.
  UPLOAD_DIR: z.string().default("uploads"),
  UPLOAD_MAX_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(2 * 1024 * 1024),

  // Hardening & ops (B12). REDIS_URL is OPTIONAL: set it and the cache, the rate-limit counters and the
  // job queue (BullMQ) live in Redis (shared across server instances, survive restarts); leave it
  // empty and the SAME interfaces run in-process (memory cache/counters, in-process job runner).
  REDIS_URL: z.string().optional(),
  CACHE_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  CACHE_TTL_SECONDS: z.coerce.number().int().min(1).default(30),
  // Background jobs: set false to run nothing in the background (tests drive jobs by hand).
  JOBS_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  // Unpaid online orders are cancelled (stock released) after this long; the sweep runs this often.
  ORDER_EXPIRY_MINUTES: z.coerce.number().int().min(1).default(30),
  ORDER_EXPIRY_SWEEP_SECONDS: z.coerce.number().int().min(5).default(60),

  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("Invalid environment configuration:\n", z.prettifyError(parsed.error))
  process.exit(1)
}

const problems = productionConfigProblems(parsed.data)
if (problems.length) {
  // eslint-disable-next-line no-console
  console.error(`Unsafe production configuration:\n- ${problems.join("\n- ")}`)
  process.exit(1)
}

export const env = parsed.data
export const isProd = env.NODE_ENV === "production"
export const isTest = env.NODE_ENV === "test"

/** Real Google needs both credentials. */
export const googleConfigured = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)
/** Mock Google: never in production; "auto" = only when real credentials are absent. */
export const googleMock =
  !isProd &&
  (env.GOOGLE_MOCK === "true" || (env.GOOGLE_MOCK === "auto" && !googleConfigured))

/** Real Razorpay needs both API keys. */
export const razorpayConfigured = Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET)
/** Mock gateway: never in production; "auto" = only while the Razorpay keys are absent. */
export const paymentMock =
  !isProd &&
  (env.PAYMENT_MOCK === "true" || (env.PAYMENT_MOCK === "auto" && !razorpayConfigured))

/** Redis is used only when a URL is configured; everything else falls back to in-process. */
export const redisEnabled = Boolean(env.REDIS_URL)
