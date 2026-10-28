import { Router } from "express"
import { authRoutes } from "./modules/auth/auth.routes.js"
import { brandRoutes, categoryRoutes } from "./modules/categories/category.routes.js"
import { healthRoutes } from "./modules/health/health.routes.js"
import { productRoutes } from "./modules/products/product.routes.js"
import { userRoutes } from "./modules/users/user.routes.js"

// Every feature module mounts here. New module = new line.
export const routes = Router()
routes.use("/health", healthRoutes)
routes.use("/auth", authRoutes)
routes.use("/users", userRoutes)
routes.use("/categories", categoryRoutes)
routes.use("/brands", brandRoutes)
routes.use("/products", productRoutes)
