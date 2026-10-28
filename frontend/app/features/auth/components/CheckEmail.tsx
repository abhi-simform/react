import { Link } from "react-router"

import { useAuth } from "../AuthProvider"
import { ResendVerificationButton } from "./ResendVerificationButton"

/** Shown right after registering (10.5): the account exists and is signed in, but unverified. */
export function CheckEmail({
  email,
  continueTo,
}: {
  email: string
  continueTo: string
}) {
  const { finishRegistration } = useAuth()
  return (
    <section
      className="mx-auto flex max-w-sm flex-col gap-3 p-4"
      aria-labelledby="check-email"
    >
      <h1 id="check-email" className="text-xl font-medium">
        Check your email
      </h1>
      <p className="text-sm">
        We sent a verification link to <strong>{email}</strong>. It is valid for
        24 hours and works once. You can keep shopping meanwhile; some features
        (like checkout) need a verified email.
      </p>
      <p className="text-sm text-neutral-500">
        In development the mail lands in Mailpit: http://localhost:8025
      </p>
      <div className="flex items-center gap-3">
        <ResendVerificationButton startCooling />
        <Link
          to={continueTo}
          replace
          className="underline"
          onClick={finishRegistration}
        >
          Continue
        </Link>
      </div>
    </section>
  )
}
