/**
 * "Fly to cart" (13.6): a copy of the product image travels from where it is to the cart button and
 * fades out. Rules this follows:
 * - only `transform` and `opacity` are animated (the compositor does it: no layout, no paint of the
 *   page), on a `position: fixed` clone that is removed when it finishes;
 * - `motion/mini` (the Web Animations API wrapper, ~2 kB) is loaded with a dynamic import() at the
 *   moment of the first use, so it costs nothing until a product is added;
 * - `prefers-reduced-motion: reduce` -> nothing plays (the toast and the cart badge still tell the
 *   user); with no source or no target (cart button hidden) -> nothing plays;
 * - it never blocks: the caller does not await it, and the add-to-cart feedback does not depend on it.
 */
const DURATION_S = 0.55

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

export async function flyToCart(source: Element | null | undefined) {
  if (!source || prefersReducedMotion()) return
  const img =
    source instanceof HTMLImageElement ? source : source.querySelector("img")
  const target = document.querySelector("[data-cart-target]")
  if (!img || !target || !img.currentSrc) return
  const from = img.getBoundingClientRect()
  const to = target.getBoundingClientRect()
  if (from.width === 0 || to.width === 0) return

  const clone = document.createElement("img")
  clone.src = img.currentSrc
  clone.alt = ""
  clone.setAttribute("aria-hidden", "true")
  clone.dataset.fly = "true"
  Object.assign(clone.style, {
    position: "fixed",
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    objectFit: "cover",
    borderRadius: "0.5rem",
    pointerEvents: "none",
    zIndex: "60",
    transformOrigin: "top left",
    willChange: "transform, opacity",
  })
  document.body.append(clone)
  try {
    const { animate } = await import("motion/mini")
    // End: the cart button's centre, ~1/6 of the size. translate is in px from the clone's own origin.
    const scale = Math.min(0.2, 28 / from.width)
    const dx = to.left + to.width / 2 - from.left - (from.width * scale) / 2
    const dy = to.top + to.height / 2 - from.top - (from.height * scale) / 2
    await animate(
      clone,
      {
        transform: [
          "translate(0px, 0px) scale(1)",
          `translate(${dx}px, ${dy}px) scale(${scale})`,
        ],
        opacity: [1, 0.4],
      },
      { duration: DURATION_S, ease: [0.4, 0, 0.2, 1] }
    ).finished
  } finally {
    clone.remove()
  }
}
