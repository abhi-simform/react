import { Heart } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router"

import { Price } from "@/components/common/Price"
import { Rating } from "@/components/common/Rating"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { Product, ProductCardData } from "../types"

/** A card needs a handful of list fields: a Pick keeps it easy to fake in tests. */
export type ProductCardProduct = ProductCardData &
  Pick<Product, "_id" | "brand" | "stock" | "ratingCount">

type ProductCardProps = {
  product: ProductCardProduct
  /** Slot content (badges) rendered over the image. Use `ProductCard.Badge`. */
  children?: React.ReactNode
  onAddToCart?: (product: ProductCardProduct) => void
  onNotifyMe?: (product: ProductCardProduct) => void
  /** E.g. the flash sale ended: the button stays but cannot be used. */
  addToCartDisabled?: boolean
}

/**
 * One link target per card: the title link is stretched over the whole card
 * with `after:absolute after:inset-0`, and the real buttons sit above it with
 * `relative z-10`. A `<button>` nested inside an `<a>` would be invalid HTML
 * (interactive content inside interactive content) and confuses keyboards and
 * screen readers.
 */
export function ProductCard({
  product,
  children,
  onAddToCart,
  onNotifyMe,
  addToCartDisabled = false,
}: ProductCardProps) {
  const [liked, setLiked] = useState(false)
  const outOfStock = product.stock <= 0
  const image = product.images[0]

  return (
    <article className="relative flex h-full flex-col gap-2 rounded-lg border p-2 focus-within:ring-2">
      <div
        className={cn(
          "relative aspect-square overflow-hidden rounded bg-neutral-100"
        )}
      >
        {image && (
          // Decorative: the title link right below names the product.
          <img
            src={image.url}
            alt=""
            width={400}
            height={400}
            loading="lazy"
            className={cn("size-full object-cover", outOfStock && "opacity-40")}
          />
        )}
        <div className="absolute top-1 left-1 flex flex-col items-start gap-1">
          {children}
        </div>
        <button
          type="button"
          aria-pressed={liked}
          aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
          onClick={() => setLiked((v) => !v)}
          className="absolute top-1 right-1 z-10 flex size-8 items-center justify-center rounded-full bg-white/90 shadow"
        >
          <Heart
            aria-hidden
            className={cn("size-4", liked && "fill-red-500 text-red-500")}
          />
        </button>
      </div>

      <div
        className={cn("flex flex-1 flex-col gap-1", outOfStock && "opacity-60")}
      >
        <p className="text-xs text-neutral-500">{product.brand}</p>
        <h3 className="line-clamp-2 text-sm font-medium">
          <Link
            to={`/p/${product.slug}`}
            className="after:absolute after:inset-0 focus:outline-none"
          >
            {product.name}
          </Link>
        </h3>
        <Rating
          value={product.ratingAvg}
          count={product.ratingCount}
          size="sm"
        />
        <Price price={product.price} mrp={product.mrp} />
        {outOfStock && <p className="text-xs text-red-700">Out of stock</p>}
      </div>

      {outOfStock ? (
        <Button
          variant="outline"
          size="sm"
          className="relative z-10"
          onClick={() => onNotifyMe?.(product)}
        >
          Notify me
        </Button>
      ) : (
        <Button
          size="sm"
          className="relative z-10"
          disabled={addToCartDisabled}
          onClick={() => onAddToCart?.(product)}
        >
          Add to cart
        </Button>
      )}
    </article>
  )
}

function ProductCardBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-amber-400 px-1.5 py-0.5 text-xs font-medium text-black">
      {children}
    </span>
  )
}

// Compound slot: <ProductCard><ProductCard.Badge>Lightning deal</ProductCard.Badge></ProductCard>
ProductCard.Badge = ProductCardBadge
