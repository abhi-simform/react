import { memo } from "react"
import { Link } from "react-router"

import { Price } from "@/components/common/Price"
import { Rating } from "@/components/common/Rating"
import { Button } from "@/components/ui/button"
import { useAddToCart } from "@/features/cart"
import { CompareToggle } from "@/features/compare"
import { WishlistHeart } from "@/features/wishlist"
import { paths } from "@/lib/paths"
import { cn } from "@/lib/utils"

import { useProductPrefetch } from "../hooks/useProductPrefetch"
import type { ProductCardVM } from "../mappers"

/** The card renders a view model (see `toProductCardVM`): no formatting or discount math in here. */
export type ProductCardProduct = ProductCardVM

type ProductCardProps = {
  product: ProductCardProduct
  /** Slot content (badges) rendered over the image. Use `ProductCard.Badge`. */
  children?: React.ReactNode
  /** Overrides the default (add to the guest cart): labs and tests pass their own. */
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
function ProductCardBase({
  product,
  children,
  onAddToCart,
  onNotifyMe,
  addToCartDisabled = false,
}: ProductCardProps) {
  const outOfStock = !product.inStock
  const addToCart = useAddToCart()
  const prefetch = useProductPrefetch(product.slug)

  return (
    <article
      {...prefetch}
      className="relative flex h-full flex-col gap-2 rounded-lg border p-2 focus-within:ring-2"
    >
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
          {children ??
            (product.deal && (
              <ProductCardBadge>
                {product.deal.badge ?? "Deal"}
              </ProductCardBadge>
            ))}
        </div>
        <WishlistHeart
          productId={product.id}
          productName={product.name}
          className="absolute top-1 right-1 z-10"
        />
      </div>

      <div className="flex flex-1 flex-col gap-1">
        <p className="text-xs text-neutral-500">{product.brand}</p>
        <h3 className="line-clamp-2 text-sm font-medium">
          <Link
            to={paths.product(product.slug)}
            prefetch="intent"
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
        <CompareToggle
          item={{
            id: product.id,
            slug: product.slug,
            name: product.name,
            imageUrl: product.image.url,
          }}
          className="relative z-10 w-fit"
        />
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
          onClick={() =>
            onAddToCart
              ? onAddToCart(product)
              : void addToCart(product.id, product.name)
          }
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

/**
 * `memo` stays even with the React Compiler on (13.2). The Compiler caches work INSIDE a component
 * and the elements it returns, but it cannot stop React from calling a child that a parent's `.map`
 * builds again: when the grid's array changes (a filter removed 40 cards) there are 300 fresh
 * <ProductCard> elements and each would run its hooks again. `memo` compares props and skips the
 * call, but only if the view model objects keep their identity (InfiniteResults keeps a `useMemo`
 * for exactly that). Measured while typing in the quick filter with 300 cards: grid render time
 * 47 ms without either, 9 ms with both (docs/perf-log.md).
 */
export const ProductCard = Object.assign(memo(ProductCardBase), {
  Badge: ProductCardBadge,
})

// Compound slot: <ProductCard><ProductCard.Badge>Lightning deal</ProductCard.Badge></ProductCard>
