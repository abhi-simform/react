import { z } from "zod"

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id")

export const listAuditSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    actor: objectId.optional(),
    target: objectId.optional(),
    entity: z
      .enum([
        "products",
        "categories",
        "brands",
        "users",
        "orders",
        "returns",
        "payments",
        "coupons",
        "deals",
        "banners",
        "reviews",
        "questions",
        "answers",
        "seller-applications",
        "system",
        "notifications",
      ])
      .optional(), // which kind of thing: /admin/<entity> or /seller/<entity> in the path
    action: z.string().trim().max(100).optional(), // prefix match: "POST /admin/orders"
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  }),
}
