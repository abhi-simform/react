import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Link, useLocation } from "react-router"

import { FormField } from "@/components/form/FormField"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth"
import { formatCurrency, formatRupees } from "@/lib/format"
import { paths } from "@/lib/paths"

import { useCartOwner } from "../cartMutation"
import { describeCouponError, describeCouponReason } from "../coupon"
import { cartQueries } from "../queries"
import { couponSchema, type CouponValues } from "../schemas"
import { useCart } from "../useCart"

/**
 * Coupon box (7.6, 11.2). The server validates and prices (`POST /cart/coupon`); this shows the
 * result: the applied coupon with its discount and a Remove button, the human reason when a code
 * is rejected, and the "Available coupons" list (each already checked against THIS cart, so it
 * says why one cannot be used). Totals everywhere update because the response is the whole cart.
 * Used in the cart page and the checkout review: one component, one cache.
 */
export function CouponBox() {
  const cart = useCart()
  const { status } = useAuth()
  const location = useLocation()
  const { owner, ownerId, ready } = useCartOwner()
  const available = useQuery({
    ...cartQueries.coupons(owner, ownerId),
    enabled: ready && cart.lines.length > 0,
  })
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(couponSchema) })
  const [message, setMessage] = useState<{ code: string; text: string }>()
  const [busy, setBusy] = useState<string | null>(null)
  const signedIn = status === "authenticated"

  async function apply(code: string) {
    setBusy(code)
    setMessage(undefined)
    try {
      await cart.applyCoupon(code)
      reset()
    } catch (err) {
      setMessage({ code, text: describeCouponError(err, code) })
    } finally {
      setBusy(null)
    }
  }

  async function remove() {
    setBusy("remove")
    try {
      await cart.removeCoupon()
    } catch {
      setMessage({
        code: "",
        text: "We could not remove the coupon. Try again.",
      })
    } finally {
      setBusy(null)
    }
  }

  const applied = cart.coupon
  const failed = applied && "error" in applied ? applied : null
  const ok = applied && "discount" in applied ? applied : null

  return (
    <section aria-label="Coupons" className="flex flex-col gap-2">
      {ok && (
        <p
          role="status"
          className="text-sm text-green-800"
          data-testid="coupon-applied"
        >
          {ok.code} applied
          {ok.description ? `: ${ok.description}` : ""}. You save{" "}
          {formatCurrency(cart.totals.discount)} on this cart.{" "}
          <button
            type="button"
            className="underline"
            disabled={busy === "remove"}
            onClick={() => void remove()}
          >
            Remove
          </button>
        </p>
      )}
      {failed && (
        <p role="alert" className="text-sm text-red-700">
          {describeCouponReason(
            failed.error.reason,
            failed.code,
            failed.error as { minOrder?: number; shortBy?: number }
          )}{" "}
          <button
            type="button"
            className="underline"
            onClick={() => void remove()}
          >
            Remove it
          </button>
        </p>
      )}

      {signedIn ? (
        <form
          onSubmit={(e) =>
            void handleSubmit((v: CouponValues) => apply(v.code))(e)
          }
          noValidate
          className="flex flex-col gap-2"
        >
          <FormField label="Coupon code" error={errors.code?.message}>
            {(c) => (
              <div className="flex gap-2">
                <input
                  className="rounded border p-1"
                  autoComplete="off"
                  {...c}
                  {...register("code", {
                    onChange: () => setMessage(undefined),
                  })}
                />
                <Button type="submit" disabled={busy !== null}>
                  {busy && busy !== "remove" ? "Checking..." : "Apply"}
                </Button>
              </div>
            )}
          </FormField>
        </form>
      ) : (
        <p className="text-sm">
          <Link className="underline" to={paths.login(location.pathname)}>
            Sign in
          </Link>{" "}
          to use a coupon.
        </p>
      )}
      {message && (
        <p
          role="alert"
          className="text-sm text-red-700"
          data-testid="coupon-error"
        >
          {message.text}
        </p>
      )}

      {available.data && available.data.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer">
            Available coupons ({available.data.length})
          </summary>
          <ul className="mt-1 flex flex-col gap-2">
            {available.data.map((c) => {
              const isApplied = ok?.code === c.code
              return (
                <li key={c.code} className="rounded border p-2">
                  <p className="font-medium">{c.code}</p>
                  <p className="text-xs">{c.description}</p>
                  {c.minOrder > 0 && (
                    <p className="text-xs text-neutral-600">
                      Min order {formatRupees(c.minOrder)}
                    </p>
                  )}
                  {!c.applicable && c.reason && (
                    <p className="text-xs text-neutral-600">
                      {describeCouponReason(c.reason, c.code, {
                        minOrder: c.minOrder,
                        shortBy: undefined,
                      })}
                    </p>
                  )}
                  {c.applicable && (
                    <p className="text-xs text-green-800">
                      Saves {formatRupees(c.discount)} on this cart
                    </p>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={
                      !signedIn || !c.applicable || isApplied || busy !== null
                    }
                    onClick={() => void apply(c.code)}
                  >
                    {isApplied ? "Applied" : "Apply"}
                    <span className="sr-only"> {c.code}</span>
                  </Button>
                </li>
              )
            })}
          </ul>
        </details>
      )}
    </section>
  )
}
