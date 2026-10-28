// Public API of the cart feature.
export { removeLine, updateQty } from "./lines"
export { computeTotals, DEFAULT_SHIPPING_RULES, TAX_PERCENT } from "./totals"
export { CartDrawer } from "./components/CartDrawer"
export type { CartLine, CartTotals, CouponRule, ShippingRules } from "./types"
export { CouponBox } from "./components/CouponBox"
export { validateCoupon, type CouponOutcome } from "./coupon"
export {
  CART_STORAGE_KEY,
  useCartLineCount,
  useCartStore,
  useCartTotals,
} from "./cartStore"
export { addLine, restoreLine, setLineQty } from "./lines"
export { freeShippingProgress } from "./totals"
export type { CartLineInput, GuestCartLine, RemovedLine } from "./types"
export { CartPage } from "./components/CartPage"
export { addToCart } from "./addToCart"
export { selectLines, selectLineCount } from "./cartStore"
