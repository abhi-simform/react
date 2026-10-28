import { useAuth } from "../AuthProvider"

import { ResendVerificationButton } from "./ResendVerificationButton"

/** Shell banner for signed-in users whose email is still unverified (10.5). */
export function VerifyEmailBanner() {
  const { status, user } = useAuth()
  if (status !== "authenticated" || !user || user.emailVerified) return null
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-3 border-b bg-amber-50 px-4 py-2 text-sm"
    >
      <span>
        Please verify your email address. We sent a link to{" "}
        <strong>{user.email}</strong>.
      </span>
      <ResendVerificationButton />
    </div>
  )
}
