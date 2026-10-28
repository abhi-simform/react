/**
 * "An order was JUST placed" (11.3). Placing empties the cart; the checkout layout redirects an
 * empty cart to /cart, which would race the navigation to the success page. This short-lived
 * marker tells the layout "empty is expected right now". After the window passes, an empty cart
 * in checkout (e.g. Browser Back from the success page) redirects to the cart as usual, which is
 * why Back never returns to the payment step.
 */
const WINDOW_MS = 5000
let placedAt = 0

export const markOrderPlaced = () => {
  placedAt = Date.now()
}
export const orderJustPlaced = () => Date.now() - placedAt < WINDOW_MS
