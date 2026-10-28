import { Link } from "react-router"

import { useAuth } from "@/features/auth"
import { paths } from "@/lib/paths"

import { ChangePasswordForm } from "./ChangePasswordForm"
import { SessionsList } from "./SessionsList"

/** /account/security (10.7). */
export function SecurityPage() {
  const { user } = useAuth()
  const hasPassword = user?.providers.includes("password") ?? false
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-medium">Security</h1>
      <section
        aria-labelledby="sec-methods"
        className="flex flex-col gap-1 text-sm"
      >
        <h2 id="sec-methods" className="font-medium">
          Sign-in methods
        </h2>
        <p>
          {user?.providers
            .map((p) => (p === "google" ? "Google" : "Password"))
            .join(" and ")}
          {user && !user.emailVerified && " · email not verified yet"}
        </p>
      </section>
      <section aria-labelledby="sec-password" className="flex flex-col gap-2">
        <h2 id="sec-password" className="font-medium">
          Password
        </h2>
        {hasPassword ? (
          <ChangePasswordForm />
        ) : (
          <p className="text-sm">
            This account signs in with Google and has no password. You can
            create one with{" "}
            <Link className="underline" to={paths.forgotPassword()}>
              Forgot password
            </Link>
            .
          </p>
        )}
      </section>
      <section aria-labelledby="sec-sessions" className="flex flex-col gap-2">
        <h2 id="sec-sessions" className="font-medium">
          Active sessions
        </h2>
        <SessionsList />
      </section>
    </div>
  )
}
