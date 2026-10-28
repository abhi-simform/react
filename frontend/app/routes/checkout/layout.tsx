import { Link, Outlet, useLocation } from "react-router"
import { paths } from "@/lib/paths"

const STEPS = [
  { slug: "address", label: "Address" },
  { slug: "delivery", label: "Delivery" },
  { slug: "payment", label: "Payment" },
  { slug: "review", label: "Review" },
] as const

/** The current step is DERIVED from the url: no state to keep in sync with it. */
export default function CheckoutLayout() {
  const { pathname } = useLocation()
  const current = STEPS.findIndex((s) => pathname.endsWith(`/${s.slug}`))
  const previous = STEPS[current - 1]
  const next = STEPS[current + 1]

  return (
    <div className="mx-auto max-w-3xl p-4">
      <ol
        aria-label="Checkout progress"
        className="mb-4 flex flex-wrap gap-4 text-sm"
      >
        {STEPS.map((step, i) => (
          <li
            key={step.slug}
            aria-current={i === current ? "step" : undefined}
            className={
              i === current
                ? "font-medium underline"
                : i < current
                  ? ""
                  : "text-neutral-500"
            }
          >
            {i + 1}. {step.label}
          </li>
        ))}
      </ol>
      <Outlet />
      <div className="mt-4 flex gap-4 text-sm">
        {previous && (
          <Link
            to={paths.checkoutStep(previous.slug)}
            replace
            className="underline"
          >
            Back
          </Link>
        )}
        {next && (
          <Link
            to={paths.checkoutStep(next.slug)}
            replace
            className="underline"
          >
            Continue to {next.label.toLowerCase()}
          </Link>
        )}
      </div>
    </div>
  )
}
