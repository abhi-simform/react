import { z } from "@/lib/zod"

/** Meta of the rail endpoints (not page meta). */
export const alsoBoughtMetaSchema = z.object({
  source: z.enum(["orders", "mixed", "similar"]),
})
export const forYouMetaSchema = z.object({
  personalised: z.boolean(),
  basedOn: z.array(z.string()),
})

export const viewedResultSchema = z.object({ recorded: z.number().int() })
