import { z } from "zod"

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id")
const idParams = z.object({ id: objectId })
const imageUrl = z.string().trim().url().max(500)

const categoryBody = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes")
    .max(100)
    .optional(),
  parentId: objectId.nullable().optional(), // null = make it a root category
  image: imageUrl.nullable().optional(),
  sortOrder: z.number().int().min(0).max(100_000).optional(),
  isActive: z.boolean().optional(),
})

export const createCategorySchema = { body: categoryBody }
export const updateCategorySchema = { params: idParams, body: categoryBody.partial() }
export const deleteCategorySchema = { params: idParams }
export const reorderCategoriesSchema = {
  body: z.object({
    parentId: objectId.nullable().default(null), // the siblings being ordered
    ids: z.array(objectId).min(1).max(200), // all of them, in the new order
  }),
}

const brandBody = z.object({
  name: z.string().trim().min(1).max(80),
  logo: imageUrl.nullable().optional(),
})
export const listAdminBrandsSchema = {
  query: z.object({ search: z.string().trim().min(1).max(80).optional() }),
}
export const createBrandSchema = { body: brandBody }
export const updateBrandSchema = { params: idParams, body: brandBody.partial() }
export const deleteBrandSchema = { params: idParams }
