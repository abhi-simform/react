import { Link } from "react-router"

import { Price } from "@/components/common/Price"
import { Rating } from "@/components/common/Rating"
import { Button } from "@/components/ui/button"
import { WishlistHeart } from "@/features/wishlist"
import { paths } from "@/lib/paths"
import { cn } from "@/lib/utils"

import type { ProductCardVM } from "../mappers"

/** The card renders a view model (see `toProductCardVM`): no formatting or discount math in here. */
export type ProductCardProduct = ProductCardVM

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
  const outOfStock = !product.inStock

  return (
    <article className="relative flex h-full flex-col gap-2 rounded-lg border p-2 focus-within:ring-2">
      <div
        className={cn(
          "relative aspect-square overflow-hidden rounded bg-neutral-100"
        )}
      >
        {/* Decorative: the title link right below names the product. */}
        <img
          src={product.image.url}
          alt=""
          width={400}
          height={400}
          loading="lazy"
          className={cn("size-full object-cover", outOfStock && "opacity-40")}
        />
        <div className="absolute top-1 left-1 flex flex-col items-start gap-1">
          {children}
        </div>
        <WishlistHeart
          productId={product.id}
          productName={product.name}
          className="absolute top-1 right-1 z-10"
        />
      </div>

      <div
        className={cn("flex flex-1 flex-col gap-1", outOfStock && "opacity-60")}
      >
        <p className="text-xs text-neutral-500">{product.brand}</p>
        <h3 className="line-clamp-2 text-sm font-medium">
          <Link
            to={paths.product(product.slug)}
            className="after:absolute after:inset-0 focus:outline-none"
          >
            {product.name}
          </Link>
        </h3>
        {product.rating ? (
          <Rating
            value={product.rating.value}
            count={product.rating.count}
            size="sm"
          />
        ) : (
          <p className="text-xs text-neutral-500">No ratings yet</p>
        )}
        <Price price={product.price} />
        {product.stockNote && (
          <p
            className={cn(
              "text-xs",
              outOfStock ? "text-red-700" : "text-amber-700"
            )}
          >
            {product.stockNote}
          </p>
        )}
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
