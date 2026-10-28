// Public API of the wishlist feature. (The /wishlist page itself is composed in
// routes/wishlist.tsx: it needs the catalog's ProductGrid, and the catalog's
// ProductCard needs WishlistHeart, so putting the page in here would be a cycle.)
export { WishlistProvider, useWishlist } from "./WishlistContext"
export { WishlistHeart } from "./components/WishlistHeart"
export { WishlistLink } from "./components/WishlistLink"
export { useWishlistProducts } from "./hooks/useWishlistProducts"
export type { WishlistProduct } from "./schemas"
