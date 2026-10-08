import { z } from "zod"

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

  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().int().default(1025),
  EMAIL_FROM: z.string().default("ShopSphere <no-reply@shopsphere.local>"),

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

export const env = parsed.data
export const isProd = env.NODE_ENV === "production"
export const isTest = env.NODE_ENV === "test"
