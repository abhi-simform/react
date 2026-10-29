import { Form, Link, data, redirect, useNavigation } from "react-router"

import { loginSchema } from "@/features/auth"
import { isApiError } from "@/lib/api/envelope"
import { serverPost } from "@/lib/serverApi.server"
import { noindexMeta } from "@/lib/seo"

import type { Route } from "./+types/login-action"

/**
 * 14.8 (SSR experiment): the login form as a React Router `action` + `<Form>`, to compare with the RHF + mutation
 * version (`features/auth/components/LoginForm.tsx`).
 *
 * What it gains: it works WITHOUT JavaScript (a plain HTML form POST: progressive enhancement), the browser never
 * holds the password in app state, validation runs on the server with the SAME Zod schema, and there is no loading
 * state to build (`useNavigation`).
 * What it loses: instant field validation as you type/blur (RHF), the single-flight and error-mapping helpers, and
 * the access token: the action runs on the server, so the in-memory token model (10.x) does not apply. This version
 * only forwards the API's refresh cookie; the page's silent `refresh` call then gets the session, as after a reload.
 *
 * Auth caveat that matters in production: the cookie below is set by the SSR server for ITS host. It reaches the API
 * only if the API is on the same host/site AND the cookie's Domain/Path allow it (works on localhost, where cookies
 * ignore ports; on `shop.` + `api.` subdomains the Set-Cookie would need `Domain=.example.com`). See the ADR.
 */
type FieldErrors = Record<string, string | undefined>

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData()
  const parsed = loginSchema.safeParse({
    email: form.get("email"),
    password: form.get("password"),
  })
  if (!parsed.success) {
    const fieldErrors: FieldErrors = {}
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form")
      fieldErrors[key] ??= issue.message
    }
    return data({ fieldErrors, formError: null }, { status: 422 })
  }

  const result = await serverPost("/auth/login", parsed.data, {
    clientIp: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    userAgent: request.headers.get("user-agent"),
  })
  if (result.status >= 200 && result.status < 300) {
    const headers = new Headers()
    for (const cookie of result.setCookies) headers.append("Set-Cookie", cookie)
    const from = new URL(request.url).searchParams.get("from")
    // Same-origin relative paths only (10.8): `//evil.com` and `https://...` collapse to the home page.
    const to = from && /^\/(?![/\\])/.test(from) ? from : "/"
    return redirect(to, { headers })
  }
  const code = isApiError(result.json) ? result.json.error.code : "UNKNOWN"
  return data(
    {
      fieldErrors: {} as FieldErrors,
      formError:
        code === "INVALID_CREDENTIALS"
          ? "Incorrect email or password."
          : code === "AUTH_RATE_LIMITED"
            ? "Too many attempts. Wait a few minutes and try again."
            : "Could not sign in. Try again.",
    },
    { status: result.status === 429 ? 429 : 400 }
  )
}

export default function LoginActionRoute({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation()
  const busy = navigation.state === "submitting"
  return (
    <div className="mx-auto max-w-sm p-4">
      <h1 className="mb-3 text-xl font-medium">
        Log in (server action version)
      </h1>
      <Form method="post" className="flex flex-col gap-3" noValidate>
        {actionData?.formError && (
          <p role="alert" className="text-sm text-destructive">
            {actionData.formError}
          </p>
        )}
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            className="rounded border px-2 py-1"
            aria-invalid={Boolean(actionData?.fieldErrors.email)}
          />
          {actionData?.fieldErrors.email && (
            <span role="alert" className="text-destructive">
              {actionData.fieldErrors.email}
            </span>
          )}
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            className="rounded border px-2 py-1"
            aria-invalid={Boolean(actionData?.fieldErrors.password)}
          />
          {actionData?.fieldErrors.password && (
            <span role="alert" className="text-destructive">
              {actionData.fieldErrors.password}
            </span>
          )}
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-primary px-3 py-1 text-primary-foreground"
        >
          {busy ? "Signing in..." : "Log in"}
        </button>
        <Link to="/login" className="text-sm underline">
          The client-side form
        </Link>
      </Form>
    </div>
  )
}

export function meta() {
  return noindexMeta("Log in")
}
