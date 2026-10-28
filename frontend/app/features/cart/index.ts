// Public API of the cart feature.
export { removeLine, updateQty } from "./lines"
export { computeTotals, DEFAULT_SHIPPING_RULES, TAX_PERCENT } from "./totals"
export { CartDrawer } from "./components/CartDrawer"
export type { CartLine, CartTotals, CouponRule, ShippingRules } from "./types"
export { CouponBox } from "./components/CouponBox"
export { describeCouponError, describeCouponReason } from "./coupon"
export { addLine, restoreLine, setLineQty, snapshotLine } from "./lines"
export { freeShippingProgress } from "./totals"
export type { CartLineInput, GuestCartLine, RemovedLine } from "./types"
export { CartIssues } from "./components/CartIssues"
export { CartPage } from "./components/CartPage"
export { CartSessionSync } from "./CartSessionSync"
export {
  deriveIssues,
  useAddToCart,
  useCart,
  useCartCount,
  useCartIssues,
} from "./useCart"
export type { CartIssues as CartIssuesData, CartLineView } from "./useCart"
export { useCartUi } from "./cartUiStore"
