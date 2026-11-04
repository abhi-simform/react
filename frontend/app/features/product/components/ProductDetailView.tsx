import { useState } from "react"

import { Price } from "@/components/common/Price"
import { Rating } from "@/components/common/Rating"
import { Button } from "@/components/ui/button"
import type { ProductDetail } from "@/features/catalog"
import type { Variant } from "@/types/domain"

import { findVariant, stockMessage, type Selection } from "../variants"
import { Gallery } from "./Gallery"
import { ProductTabs } from "./ProductTabs"
import { VariantPicker } from "./VariantPicker"

type ProductDetailViewProps = {
  product: ProductDetail
  variants: readonly Variant[]
}

export function ProductDetailView({
  product,
  variants,
}: ProductDetailViewProps) {
  // State: only the chosen attribute values. Everything below is derived.
  const [selection, setSelection] = useState<Selection>({})
  const variant = findVariant(variants, selection)
  const price = variant?.price ?? product.price
  const mrp = variant?.mrp ?? product.mrp
  const canBuy = variant !== undefined && variant.stock > 0

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Gallery images={product.images} productName={product.name} />
      <div className="flex flex-col gap-3">
        <p className="text-sm text-neutral-500">{product.brand}</p>
        <h1 className="text-xl font-medium">{product.name}</h1>
        <Rating value={product.ratingAvg} count={product.ratingCount} />
        <Price price={price} mrp={mrp} className="text-lg" />
        <VariantPicker
          variants={variants}
          selection={selection}
          onSelectionChange={setSelection}
        />
        <p role="status">{stockMessage(variant)}</p>
        <Button
          disabled={!canBuy}
          onClick={() => console.log("add to cart", variant?.sku)}
        >
          Add to cart
        </Button>
      </div>
      <div className="md:col-span-2">
        <ProductTabs product={product} />
      </div>
    </div>
  )
}
