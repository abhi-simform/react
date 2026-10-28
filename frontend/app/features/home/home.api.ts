import { z } from "zod"

import { api } from "@/lib/api/client"

import { bannerSchema } from "./schemas"

export const getBanners = (placement: "hero" | "strip", signal?: AbortSignal) =>
  api("/banners", {
    query: { placement },
    schema: z.array(bannerSchema),
    signal,
  })
