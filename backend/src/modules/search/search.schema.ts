import { z } from "zod"

export const suggestSchema = {
  query: z.object({
    q: z.string().trim().min(2).max(60),
    limit: z.coerce.number().int().min(1).max(10).default(6),
  }),
}
