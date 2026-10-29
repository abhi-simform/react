import { z } from "zod"
import { Setting } from "./settings.model.js"

export const DEFAULT_SETTINGS = {
  storeName: "ShopSphere",
  supportEmail: "support@shopsphere.local",
  lowStockThreshold: 5,
  announcement: "",
}
export type Settings = typeof DEFAULT_SETTINGS

export const updateSettingsSchema = {
  body: z
    .object({
      storeName: z.string().trim().min(1).max(60),
      supportEmail: z.email().max(120),
      lowStockThreshold: z.number().int().min(0).max(1000),
      announcement: z.string().trim().max(200),
    })
    .partial()
    .refine((v) => Object.keys(v).length > 0, "Send at least one field"),
}

export async function getSettings(): Promise<Settings> {
  const doc = await Setting.findOne({ key: "platform" }).lean()
  return {
    storeName: doc?.storeName ?? DEFAULT_SETTINGS.storeName,
    supportEmail: doc?.supportEmail ?? DEFAULT_SETTINGS.supportEmail,
    lowStockThreshold: doc?.lowStockThreshold ?? DEFAULT_SETTINGS.lowStockThreshold,
    announcement: doc?.announcement ?? DEFAULT_SETTINGS.announcement,
  }
}

export async function updateSettings(patch: Partial<Settings>) {
  await Setting.updateOne({ key: "platform" }, { $set: patch }, { upsert: true })
  return getSettings()
}
