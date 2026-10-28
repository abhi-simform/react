import { useState } from "react"
import { useNavigate } from "react-router"

import { Price } from "@/components/common/Price"
import { Rating } from "@/components/common/Rating"
import { usePrevious } from "@/hooks/usePrevious"
import { QuantityStepper } from "@/components/common/QuantityStepper"
import { Button } from "@/components/ui/button"
import type { ProductDetailVM } from "@/features/catalog"
import { toPriceVM } from "@/lib/format"
import { useAddToCart } from "@/features/cart"
import { CompareToggle } from "@/features/compare"
import { DealEndsNote } from "@/features/deals"
import { DeliveryCheck } from "@/features/delivery"
import { useTrackView } from "@/features/recommendations"
import { WishlistHeart } from "@/features/wishlist"
import { paths } from "@/lib/paths"
import type { Variant } from "@/types/domain"

import { findVariant, stockMessage, type Selection } from "../variants"
import { Gallery } from "./Gallery"
import { OffersPanel } from "./OffersPanel"
import { ShareButton } from "./ShareButton"
import { StickyBuyBar } from "./StickyBuyBar"
import { ProductTabs } from "./ProductTabs"
import { VariantPicker } from "./VariantPicker"

type ProductDetailViewProps = {
  product: ProductDetailVM
  variants: readonly Variant[]
  /** Basic fields came from a cached list; description, specs and reviews are still loading (9.7). */
  detailsPending?: boolean
}

export function ProductDetailView({
  product,
  variants,
  detailsPending = false,
}: ProductDetailViewProps) {
  // State: only the chosen attribute values. Everything below is derived.
  const [selection, setSelection] = useState<Selection>({})
  const [qty, setQty] = useState(1)
  const addToCart = useAddToCart()
  const navigate = useNavigate()
  const variant = findVariant(variants, selection)
  // A selected variant overrides the price: the same mapper builds the tag.
  // A live deal (B4) beats a variant's price: the server charges the deal price per product.
  const price = product.deal
    ? product.amount
    : (variant?.price ?? product.amount)
  const priceVM =
    variant && !product.deal
      ? toPriceVM(variant.price, variant.mrp)
      : product.price
  const previousPrice = usePrevious(price)

  // "Viewed" is recorded after 3 s on the page (B8): server list when signed in, local list for guests.
  useTrackView(product.id)
  const canBuy = variant !== undefined && variant.stock > 0
  // Derived: if a variant with less stock is picked, the shown quantity is
  // capped in render. No effect to "fix up" state afterwards.
  const maxQty = Math.max(1, variant?.stock ?? 1)
  const quantity = Math.min(qty, maxQty)

  // One add-to-cart path for the buy box and the mobile bar. The server cart is keyed by PRODUCT
  // (the API has no variants yet; the variant picker is still fixture data), so the chosen options
  // only show in the toast.
  async function add(): Promise<boolean> {
    if (!variant) return false
    const options = Object.values(variant.attributes).join(", ")
    return addToCart(
      product.id,
      options ? `${product.name} (${options})` : product.name,
      quantity
    )
  }
  async function buyNow() {
    if (await add()) void navigate(paths.checkout())
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Gallery images={product.images} productName={product.name} />
      {/* Desktop: the buy box stays in view while the (long) tabs scroll past on the left/below. */}
      <div className="flex flex-col gap-3 md:sticky md:top-4 md:self-start">
        <p className="text-sm text-neutral-500">{product.brand}</p>
        <h1 className="text-xl font-medium">{product.name}</h1>
        {product.rating ? (
          <Rating value={product.rating.value} count={product.rating.count} />
        ) : (
          <p className="text-sm text-neutral-500">No ratings yet</p>
        )}
        <Price price={priceVM} className="text-lg" />
        {product.deal && <DealEndsNote endsAt={product.deal.endsAt} />}
        {previousPrice !== undefined && previousPrice !== price && (
          <p className="text-sm text-neutral-600">
            Price changed from {toPriceVM(previousPrice, undefined).current}
          </p>
        )}
        <p className="text-xs text-neutral-500">
          Listed {product.listedOn}, updated {product.updatedAgo}
        </p>
        <VariantPicker
          variants={variants}
          selection={selection}
          onSelectionChange={setSelection}
        />
        <p role="status">{stockMessage(variant)}</p>
        <QuantityStepper value={quantity} onValueChange={setQty} max={maxQty} />
        <Button disabled={!canBuy} onClick={() => void add()}>
          Add to cart
        </Button>
        <OffersPanel />
        <DeliveryCheck />
        {/* Same shared Set as the cards and the header count (no request of its own). */}
        <div className="flex items-center gap-2 text-sm">
          <WishlistHeart
            productId={product.id}
            productName={product.name}
            className="border"
          />
          <span aria-hidden>Wishlist</span>
          <ShareButton title={product.name} />
          <CompareToggle
            item={{
              id: product.id,
              slug: product.slug,
              name: product.name,
              imageUrl: product.image.url,
            }}
          />
        </div>
      </div>
      <StickyBuyBar
        price={priceVM}
        disabled={!canBuy}
        onAdd={() => void add()}
        onBuyNow={() => void buyNow()}
      />
      <div className="md:col-span-2">
        {detailsPending ? (
          // Same box the tabs will fill: no layout jump when the real detail arrives.
          <div aria-busy="true" className="min-h-48 rounded border p-3 text-sm">
            <p role="status">Loading the full details...</p>
          </div>
        ) : (
          <ProductTabs product={product} />
        )}
      </div>
    </div>
  )
}
