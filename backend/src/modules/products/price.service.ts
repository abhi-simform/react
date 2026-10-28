import { ApiError } from "../../utils/ApiError.js"
import { enqueue, registerJob } from "../../jobs/queue.js"
import { notify } from "../notifications/notification.service.js"
import { priceDropTemplate } from "../notifications/notification.templates.js"
import { WishlistItem } from "../wishlist/wishlist.model.js"
import { Product } from "./product.model.js"

type PriceDrop = { productId: string; from: number; to: number }

/**
 * Staff price change. The write is synchronous (and busts the catalog cache through the model
 * hook); telling every wishlister is NOT: a popular product may have thousands, so a price DROP
 * enqueues one `price-drop.alert` job and the request returns at once.
 */
export async function setProductPrice(id: string, price: number) {
  const product = await Product.findById(id)
  if (!product) throw ApiError.notFound("Product not found")
  const from = product.price
  if (price > product.mrp)
    throw ApiError.badRequest("Price cannot be higher than the list price (mrp)")
  if (price === from) return { product, from, to: price, alerted: false }
  product.price = price
  await product.save()
  const dropped = price < from
  if (dropped)
    await enqueue("price-drop.alert", {
      productId: String(product._id),
      from,
      to: price,
    } satisfies PriceDrop)
  return { product, from, to: price, alerted: dropped }
}

/** Job handler: notify (in-app, email if the shopper opted in) everyone who wishlisted it. */
export async function alertPriceDrop({ productId, from, to }: PriceDrop) {
  const product = await Product.findById(productId).select("name slug").lean()
  if (!product) return 0
  let sent = 0
  // Cursor, not .find(): constant memory however many people wishlisted it.
  for await (const w of WishlistItem.find({ product: productId })
    .select("user")
    .cursor()) {
    await notify(
      String(w.user),
      priceDropTemplate(
        { id: productId, name: product.name, slug: product.slug },
        from,
        to
      ),
      { productId, from, to }
    )
    sent++
  }
  return sent
}

registerJob<PriceDrop>("price-drop.alert", async (d) => void (await alertPriceDrop(d)))
