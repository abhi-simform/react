import { useEffect, useState } from "react"

import { Price } from "@/components/common/Price"
import { Rating } from "@/components/common/Rating"
import { usePrevious } from "@/hooks/usePrevious"
import { QuantityStepper } from "@/components/common/QuantityStepper"
import { Button } from "@/components/ui/button"
import type { ProductDetailVM } from "@/features/catalog"
import { toPriceVM } from "@/lib/format"
import { WishlistHeart } from "@/features/wishlist"
import type { Variant } from "@/types/domain"

import { useRecentlyViewed } from "../hooks/useRecentlyViewed"
import { findVariant, stockMessage, type Selection } from "../variants"
import { Gallery } from "./Gallery"
import { ProductTabs } from "./ProductTabs"
import { VariantPicker } from "./VariantPicker"

type ProductDetailViewProps = {
  product: ProductDetailVM
  variants: readonly Variant[]
}

export function ProductDetailView({
  product,
  variants,
}: ProductDetailViewProps) {
  // State: only the chosen attribute values. Everything below is derived.
  const [selection, setSelection] = useState<Selection>({})
  const [qty, setQty] = useState(1)
  const variant = findVariant(variants, selection)
  // A selected variant overrides the price: the same mapper builds the tag.
  const price = variant?.price ?? product.amount
  const priceVM = variant
    ? toPriceVM(variant.price, variant.mrp)
    : product.price
  const previousPrice = usePrevious(price)

  // Viewing this product syncs an external system (localStorage): an effect.
  // `push` is stable and the list is de-duplicated, so StrictMode's second
  // run changes nothing.
  const { push } = useRecentlyViewed()
  const productId = product.id
  useEffect(() => push(productId), [push, productId])
  const canBuy = variant !== undefined && variant.stock > 0
  // Derived: if a variant with less stock is picked, the shown quantity is
  // capped in render. No effect to "fix up" state afterwards.
  const maxQty = Math.max(1, variant?.stock ?? 1)
  const quantity = Math.min(qty, maxQty)

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Gallery images={product.images} productName={product.name} />
      <div className="flex flex-col gap-3">
        <p className="text-sm text-neutral-500">{product.brand}</p>
        <h1 className="text-xl font-medium">{product.name}</h1>
        {product.rating ? (
          <Rating value={product.rating.value} count={product.rating.count} />
        ) : (
          <p className="text-sm text-neutral-500">No ratings yet</p>
        )}
        <Price price={priceVM} className="text-lg" />
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
        <Button
          disabled={!canBuy}
          onClick={() => console.log("add to cart", variant?.sku, quantity)}
        >
          Add to cart
        </Button>
        {/* Same shared Set as the cards and the header count (no request of its own). */}
        <div className="flex items-center gap-2 text-sm">
          <WishlistHeart
            productId={product.id}
            productName={product.name}
            className="border"
          />
          <span aria-hidden>Wishlist</span>
        </div>
      </div>
      <div className="md:col-span-2">
        <ProductTabs product={product} />
      </div>
    </div>
  )
}
