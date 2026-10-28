import crypto from "node:crypto"
import jwt from "jsonwebtoken"
import { env, googleConfigured, googleMock } from "../../config/env.js"

// Server-side authorization-code flow. The browser only ever sees redirects; Google's tokens
// are exchanged here, with the client SECRET, which never leaves the server.

export interface GoogleProfile {
  sub: string
  email: string
  emailVerified: boolean
  name: string
  picture?: string
}

export const googleEnabled = googleMock || googleConfigured
export { googleMock }

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const TOKEN_URL = "https://oauth2.googleapis.com/token"

// ---- `state`: CSRF protection for the redirect round trip ----------------------------
// A random nonce goes to Google (and comes back in the callback URL) AND into a short-lived
// httpOnly cookie together with where to send the user afterwards. The callback only proceeds
// when both match: a forged callback link cannot carry the victim's cookie.

export const STATE_COOKIE = "oauthState"

export function createState(redirect: string) {
  const nonce = crypto.randomBytes(16).toString("hex")
  const cookie = jwt.sign({ nonce, redirect }, env.JWT_ACCESS_SECRET, {
    expiresIn: "10m",
    audience: "oauth-state",
  })
  return { nonce, cookie }
}

export function readState(cookie: string | undefined, nonce: string | undefined) {
  if (!cookie || !nonce) return null
  try {
    const p = jwt.verify(cookie, env.JWT_ACCESS_SECRET, { audience: "oauth-state" }) as {
      nonce: string
      redirect: string
    }
    const a = Buffer.from(p.nonce)
    const b = Buffer.from(nonce)
    return a.length === b.length && crypto.timingSafeEqual(a, b) ? p : null
  } catch {
    return null
  }
}

/** Only same-site relative paths survive; everything else becomes "/" (open-redirect guard). */
export function safeRedirect(value: unknown): string {
  if (typeof value !== "string" || value.length > 500) return "/"
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/"
  if ([...value].some((ch) => ch.charCodeAt(0) < 32)) return "/" // no CR/LF/NUL tricks
  return value
}

// ---- real Google ------------------------------------------------------------------

export function authorizationUrl(nonce: string) {
  const q = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID!,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    state: nonce,
    prompt: "select_account",
  })
  return `${AUTH_URL}?${q}`
}

/**
 * Trade the one-time `code` for the user's profile. The id_token comes straight from Google's
 * token endpoint over TLS (not from the browser), so reading its payload is sound; we still
 * check issuer, audience and expiry.
 */
async function exchangeWithGoogle(code: string): Promise<GoogleProfile> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`Google token endpoint answered ${res.status}`)
  const { id_token } = (await res.json()) as { id_token?: string }
  const p = jwt.decode(id_token ?? "") as Record<string, unknown> | null
  if (
    !p ||
    p.aud !== env.GOOGLE_CLIENT_ID ||
    !["https://accounts.google.com", "accounts.google.com"].includes(String(p.iss)) ||
    Number(p.exp) * 1000 < Date.now() ||
    typeof p.sub !== "string" ||
    typeof p.email !== "string"
  )
    throw new Error("Unexpected id_token from Google")
  return {
    sub: p.sub,
    email: p.email.toLowerCase(),
    emailVerified: p.email_verified === true,
    name: typeof p.name === "string" ? p.name : p.email,
    picture: typeof p.picture === "string" ? p.picture : undefined,
  }
}

// ---- mock Google (non-production, no credentials) ------------------------------------
// The mock "code" is just base64url(JSON profile). The consent page below lets a developer
// type any identity, including an UNVERIFIED email, to exercise every branch of the callback.

export const mockCode = (p: GoogleProfile) =>
  "mock." + Buffer.from(JSON.stringify(p)).toString("base64url")

function exchangeWithMock(code: string): GoogleProfile {
  const p = JSON.parse(
    Buffer.from(code.slice(5), "base64url").toString()
  ) as GoogleProfile
  if (typeof p.sub !== "string" || typeof p.email !== "string")
    throw new Error("bad mock code")
  return { ...p, email: p.email.toLowerCase() }
}

export async function exchangeCode(code: string): Promise<GoogleProfile> {
  if (googleMock && code.startsWith("mock.")) return exchangeWithMock(code)
  if (!googleConfigured) throw new Error("Google is not configured")
  return exchangeWithGoogle(code)
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

export function mockConsentPage(nonce: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Mock Google sign-in</title></head>
<body style="font-family:sans-serif;max-width:26rem;margin:3rem auto">
<h1>Mock Google sign-in</h1>
<p>Development stand-in for Google (no GOOGLE_CLIENT_ID is configured). Choose who you are.</p>
<form method="get" action="${esc(new URL(env.GOOGLE_REDIRECT_URI).pathname)}">
<input type="hidden" name="state" value="${esc(nonce)}">
<p><label>Email <input name="email" type="email" value="google.user@example.com" required></label></p>
<p><label>Name <input name="name" value="Gabby Google"></label></p>
<p><label><input name="verified" type="checkbox" value="1" checked> Google says this email is verified</label></p>
<p><button name="decision" value="allow">Continue as this account</button>
<button name="decision" value="deny" formnovalidate>Cancel</button></p>
</form></body></html>`
}
