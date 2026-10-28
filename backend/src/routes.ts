import { Router } from "express"
import { authRoutes } from "./modules/auth/auth.routes.js"
import { brandRoutes, categoryRoutes } from "./modules/categories/category.routes.js"
import { healthRoutes } from "./modules/health/health.routes.js"
import { productRoutes } from "./modules/products/product.routes.js"
import { addressRoutes } from "./modules/addresses/address.routes.js"
import { pincodeRoutes } from "./modules/pincodes/pincode.routes.js"
import { uploadRoutes } from "./modules/uploads/upload.routes.js"
import { wishlistRoutes } from "./modules/wishlist/wishlist.routes.js"
import { cartRoutes } from "./modules/cart/cart.routes.js"
import { sellerRoutes } from "./modules/seller/seller.routes.js"
import { adminBannerRoutes, bannerRoutes } from "./modules/banners/banner.routes.js"
import { adminCouponRoutes, couponRoutes } from "./modules/coupons/coupon.routes.js"
import { adminDealRoutes, dealRoutes } from "./modules/deals/deal.routes.js"
import { timeRoutes } from "./modules/health/time.routes.js"
import { userRoutes } from "./modules/users/user.routes.js"

// Every feature module mounts here. New module = new line.
export const routes = Router()
routes.use("/health", healthRoutes)
routes.use("/auth", authRoutes)
routes.use("/users", userRoutes)
routes.use("/categories", categoryRoutes)
routes.use("/brands", brandRoutes)
routes.use("/products", productRoutes)
routes.use("/wishlist", wishlistRoutes)
routes.use("/addresses", addressRoutes)
routes.use("/pincodes", pincodeRoutes)
routes.use("/uploads", uploadRoutes)
routes.use("/cart", cartRoutes)
routes.use("/seller", sellerRoutes)
routes.use("/coupons", couponRoutes)
routes.use("/deals", dealRoutes)
routes.use("/banners", bannerRoutes)
routes.use("/time", timeRoutes)
routes.use("/admin/coupons", adminCouponRoutes)
routes.use("/admin/deals", adminDealRoutes)
routes.use("/admin/banners", adminBannerRoutes)
