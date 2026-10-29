import { z } from "@/lib/zod"

/** `GET /banners?placement=hero` (B4). `linkUrl` is a same-site path chosen by an admin. */
export const bannerSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string().nullable(),
  imageUrl: z.string(),
  linkUrl: z.string(),
  placement: z.enum(["hero", "strip"]),
})
export type Banner = z.infer<typeof bannerSchema>
