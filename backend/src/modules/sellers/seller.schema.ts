import { z } from "zod"
import { APPLICATION_STATUSES } from "./sellerApplication.model.js"

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id")

export const applySchema = {
  body: z.object({
    businessName: z.string().trim().min(2).max(100),
    gstin: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[0-9A-Z]{15}$/, "A GSTIN has 15 letters/digits")
      .optional(),
    phone: z
      .string()
      .trim()
      .regex(/^[6-9]\d{9}$/, "10-digit Indian mobile number"),
    about: z.string().trim().max(600).default(""),
  }),
}
export const listApplicationsSchema = {
  query: z.object({
    status: z.enum(APPLICATION_STATUSES).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
}
export const decisionSchema = {
  params: z.object({ id: objectId }),
  body: z
    .object({
      decision: z.enum(["approve", "reject"]),
      note: z.string().trim().min(3).max(300).optional(),
    })
    .refine((b) => b.decision === "approve" || b.note, {
      message: "Say why the application is rejected",
      path: ["note"],
    }),
}
export const sellerIdSchema = { params: z.object({ id: objectId }) }
