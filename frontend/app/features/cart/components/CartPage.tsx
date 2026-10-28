import { useIsMutating } from "@tanstack/react-query"
import { ShoppingCart } from "lucide-react"
import { ChargedInInr, useT } from "@/features/i18n"
import { Link } from "react-router"

import { AsyncView } from "@/components/common/AsyncView"
import { EmptyState } from "@/components/common/EmptyState"
import { ListSkeleton } from "@/components/common/Skeletons"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/format"
import { cartKeys } from "@/lib/queryKeys"
import { paths } from "@/lib/paths"

import { useCart } from "../useCart"
import { CartIssues } from "./CartIssues"
import { CartLineList } from "./CartLineList"
import { CartLineRow } from "./CartLineRow"
import { CouponBox } from "./CouponBox"
import { FreeShippingBar } from "./FreeShippingBar"

/** `/cart`: the server cart (guest by token, user by JWT) through the `useCart` facade. */
export function CartPage() {
  const t = useT("cart")
  const cart = useCart()
  const { totals, lines, saved } = cart
  // A cart request is in flight (quantity edit, move, coupon...): do not let the shopper leave
  // for checkout with numbers that are about to change.
  const busy = useIsMutating({ mutationKey: cartKeys.all }) > 0
  const blocked = cart.issueCount > 0 || cart.priceChangeCount > 0

  return (
    <div className="mx-auto max-w-5xl p-4">
      <AsyncView
        state={cart.state}
        loading={<ListSkeleton rows={3} label="Loading your cart" />}
      >
        {() =>
          lines.length === 0 && saved.length === 0 ? (
            <div className="mx-auto max-w-3xl">
              <h1 className="mb-3 text-xl font-medium">{t("titleEmpty")}</h1>
              <EmptyState
                icon={<ShoppingCart className="size-8" />}
                title={t("emptyTitle")}
                description={t("emptyDescription")}
                action={
                  <Link className="underline" to={paths.products()}>
                    {t("browse")}
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-[1fr_20rem]">
              <section aria-label="Cart items">
                <div className="mb-2 flex items-center justify-between">
                  <h1 className="text-xl font-medium">
                    {t("title", { count: lines.length })}
                  </h1>
                  <Button variant="outline" size="sm" onClick={cart.clear}>
                    {t("clear")}
                  </Button>
                </div>
                <CartIssues />
                <FreeShippingBar subtotal={totals.subtotal - totals.discount} />
                {lines.length === 0 ? (
                  <p className="py-3 text-sm">{t("nothing")}</p>
                ) : (
                  <CartLineList>
                    {lines.map((line) => (
                      <CartLineRow
                        key={line.productId}
                        line={line}
                        actions={cart}
                      />
                    ))}
                  </CartLineList>
                )}
                {saved.length > 0 && (
                  <section aria-labelledby="saved-title" className="mt-6">
                    <h2 id="saved-title" className="font-medium">
                      Saved for later ({saved.length})
                    </h2>
                    <ul>
                      {saved.map((line) => (
                        <CartLineRow
                          key={line.productId}
                          line={line}
                          actions={cart}
                          saved
                        />
                      ))}
                    </ul>
                  </section>
                )}
              </section>
              <aside aria-label={t("summary")} className="flex flex-col gap-3">
                <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
                  <dt>{t("subtotal")}</dt>
                  <dd>{formatCurrency(totals.subtotal)}</dd>
                  {totals.discount > 0 && (
                    <>
                      <dt>{t("couponDiscount")}</dt>
                      <dd>-{formatCurrency(totals.discount)}</dd>
                    </>
                  )}
                  <dt>{t("shipping")}</dt>
                  <dd>
                    {totals.shipping === 0
                      ? t("free")
                      : formatCurrency(totals.shipping)}
                  </dd>
                  <dt>{t("tax")}</dt>
                  <dd>{formatCurrency(totals.tax)}</dd>
                  <dt className="border-t pt-1 font-medium">{t("total")}</dt>
                  <dd className="border-t pt-1 font-medium">
                    {formatCurrency(totals.total)}
                  </dd>
                </dl>
                {totals.savings > 0 && (
                  <p
                    className="text-sm text-success"
                    data-testid="cart-savings"
                  >
                    {t("save", { amount: formatCurrency(totals.savings) })}
                  </p>
                )}
                <ChargedInInr />
                <CouponBox />
                <Button
                  nativeButton={false}
                  disabled={lines.length === 0 || blocked || busy}
                  render={<Link to={paths.checkout()} />}
                >
                  {t("proceed")}
                </Button>
                {blocked && (
                  <p className="text-xs text-destructive">{t("resolve")}</p>
                )}
              </aside>
            </div>
          )
        }
      </AsyncView>
    </div>
  )
}
