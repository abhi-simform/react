// All namespaces of one language. `en` is bundled (the fallback and the default); `hi` and `ar` are loaded
// on demand by `lib/i18n.ts` through a dynamic import() of this file: a visitor who never switches
// language never downloads them.
import cart from "./cart.json"
import checkout from "./checkout.json"
import common from "./common.json"
import product from "./product.json"

export const resources = { common, cart, product, checkout }
