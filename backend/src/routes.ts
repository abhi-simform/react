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
import {
  adminOrderRoutes,
  adminReturnRoutes,
  orderRoutes,
} from "./modules/orders/order.routes.js"
import { adminPaymentRoutes, paymentRoutes } from "./modules/payments/payment.routes.js"
import {
  adminReviewRoutes,
  answerRoutes,
  productReviewRoutes,
  questionRoutes,
  reviewRoutes,
} from "./modules/reviews/review.routes.js"
import { searchRoutes } from "./modules/search/search.routes.js"
import {
  productDiscoveryRoutes,
  recentlyViewedRoutes,
  recommendationRoutes,
} from "./modules/recommendations/recommendations.routes.js"
import { userRoutes } from "./modules/users/user.routes.js"

// Every feature module mounts here. New module = new line.
export const routes = Router()
routes.use("/health", healthRoutes)
routes.use("/auth", authRoutes)
routes.use("/users", userRoutes)
routes.use("/categories", categoryRoutes)
routes.use("/brands", brandRoutes)
routes.use("/products/:productId", productReviewRoutes)
routes.use("/products", productDiscoveryRoutes)
routes.use("/products", productRoutes)
routes.use("/search", searchRoutes)
routes.use("/me/recently-viewed", recentlyViewedRoutes)
routes.use("/recommendations", recommendationRoutes)
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
routes.use("/orders", orderRoutes)
routes.use("/admin/orders", adminOrderRoutes)
routes.use("/admin/returns", adminReturnRoutes)
routes.use("/payments", paymentRoutes)
routes.use("/admin/payments", adminPaymentRoutes)
routes.use("/reviews", reviewRoutes)
routes.use("/questions", questionRoutes)
routes.use("/answers", answerRoutes)
routes.use("/admin", adminReviewRoutes)
