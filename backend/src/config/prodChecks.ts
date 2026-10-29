/**
 * 14.2: refuse to boot a PRODUCTION process with a configuration that would be insecure or would
 * silently break login. Pure (takes the parsed values), so it is unit tested without starting anything.
 * Returns human readable problems; env.ts prints them and exits when there are any.
 */
export type ProdConfig = {
  NODE_ENV: string
  COOKIE_SECURE: boolean
  COOKIE_SAMESITE: "lax" | "strict" | "none"
  JWT_ACCESS_SECRET: string
  CORS_ORIGINS: string[]
  CLIENT_URL: string
}

const DEV_SECRET = /dev-only|change-me|changeme|example|secret-secret/i
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/

export function productionConfigProblems(c: ProdConfig): string[] {
  if (c.NODE_ENV !== "production") return []
  const problems: string[] = []
  if (!c.COOKIE_SECURE)
    problems.push(
      "COOKIE_SECURE must be true in production: a non-Secure refresh cookie travels over plain HTTP"
    )
  if (DEV_SECRET.test(c.JWT_ACCESS_SECRET))
    problems.push(
      "JWT_ACCESS_SECRET looks like the development placeholder: generate a random one"
    )
  if (c.CORS_ORIGINS.some((o) => o.includes("*")))
    problems.push(
      "CORS_ORIGINS must list explicit origins: a wildcard is not allowed together with credentials"
    )
  const insecure = c.CORS_ORIGINS.filter(
    (o) => !o.startsWith("https://") && !LOCAL.test(o)
  )
  if (insecure.length)
    problems.push(
      `CORS_ORIGINS must be https:// origins in production (got ${insecure.join(", ")})`
    )
  if (!c.CLIENT_URL.startsWith("https://") && !/^http:\/\/localhost/.test(c.CLIENT_URL))
    problems.push("CLIENT_URL must be an https:// URL in production (e-mails link to it)")
  return problems
}
