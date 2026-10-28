import { Router } from "express"
import { authenticate, authorize } from "../../middleware/auth.js"
import { ok } from "../../utils/response.js"
import { Product } from "../products/product.model.js"

// Placeholder for the seller portal API (B11). It exists in B10 so the role gate can be
// exercised end to end: the UI shows a 403 page AND the API refuses (never trust the UI alone).
export const sellerRoutes = Router()
sellerRoutes.use(authenticate, authorize("seller", "admin"))
sellerRoutes.get("/me", async (req, res) => {
  const productCount = await Product.countDocuments({ seller: req.user!.id })
  ok(res, { sellerId: req.user!.id, role: req.user!.role, productCount })
})
