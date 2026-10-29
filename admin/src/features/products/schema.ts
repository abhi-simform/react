import { z } from "zod"
import type { ProductDetail } from "./types"

// Mirrors backend/src/modules/products/product.admin.schema.ts. Prices are WHOLE RUPEES: the
// input is parsed with valueAsNumber and `.int()` rejects 99.5 here, before it can ever become a
// float bug on the wire. The server re-checks everything (422 with dotted paths).
const rupees = (what: string) =>
  z
    .number({ error: `Enter ${what}` })
    .int("Whole rupees only")
    .min(0, "Cannot be negative")

export const variantFormSchema = z.object({
  sku: z.string().trim().min(1, "SKU is required").max(60),
  color: z.string().trim().max(40),
  size: z.string().trim().max(40),
  price: rupees("a price"),
  stock: rupees("stock"),
})

export const productFormSchema = z
  .object({
    name: z.string().trim().min(2, "At least 2 characters").max(200),
    description: z.string().max(10_000),
    brand: z.string().trim().min(1, "Pick a brand"),
    categoryId: z.string().min(1, "Pick a category"),
    status: z.enum(["active", "draft", "archived"]),
    isFeatured: z.boolean(),
    highlights: z
      .array(z.object({ value: z.string().trim().min(1, "Empty highlight") }))
      .max(10),
    price: rupees("a price").min(1, "At least 1"),
    mrp: rupees("the MRP").min(1, "At least 1"),
    stock: rupees("stock"),
    sku: z.string().trim().min(1, "SKU is required").max(60),
    variants: z.array(variantFormSchema).max(50),
    images: z
      .array(z.object({ url: z.string().url(), alt: z.string().max(200) }))
      .max(10),
    specs: z
      .array(
        z.object({
          key: z.string().trim().min(1, "Name is required").max(60),
          value: z.string().trim().min(1, "Value is required").max(200),
        })
      )
      .max(30),
    slug: z
      .string()
      .trim()
      .max(220)
      .refine(
        (s) => s === "" || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s),
        "Lowercase letters, numbers, dashes"
      ),
    tags: z.string().max(400),
  })
  .superRefine((v, ctx) => {
    if (Number.isFinite(v.price) && Number.isFinite(v.mrp) && v.price > v.mrp)
      ctx.addIssue({
        code: "custom",
        path: ["price"],
        message: "Price cannot be higher than the MRP",
      })
    const seen = new Set<string>()
    v.variants.forEach((variant, i) => {
      const k = variant.sku.toLowerCase()
      if (seen.has(k) || k === v.sku.toLowerCase())
        ctx.addIssue({
          code: "custom",
          path: ["variants", i, "sku"],
          message: "Each variant needs its own SKU",
        })
      seen.add(k)
    })
  })

export type ProductFormValues = z.infer<typeof productFormSchema>

export const emptyProduct: ProductFormValues = {
  name: "",
  description: "",
  brand: "",
  categoryId: "",
  status: "draft",
  isFeatured: false,
  highlights: [],
  price: 0,
  mrp: 0,
  stock: 0,
  sku: "",
  variants: [],
  images: [],
  specs: [],
  slug: "",
  tags: "",
}

export function toFormValues(p: ProductDetail): ProductFormValues {
  return {
    name: p.name,
    description: p.description ?? "",
    brand: p.brand,
    categoryId: p.category?._id ?? "",
    status: p.status,
    isFeatured: p.isFeatured,
    highlights: (p.highlights ?? []).map((value) => ({ value })),
    price: p.price,
    mrp: p.mrp,
    stock: p.stock,
    sku: p.sku,
    variants: (p.variants ?? []).map((v) => ({
      sku: v.sku,
      color: v.color ?? "",
      size: v.size ?? "",
      price: v.price,
      stock: v.stock,
    })),
    images: (p.images ?? []).map((i) => ({ url: i.url, alt: i.alt ?? "" })),
    specs: (p.specs ?? []).map((s) => ({ key: s.key, value: s.value })),
    slug: p.slug,
    tags: (p.tags ?? []).join(", "),
  }
}

/** Form values -> the API body. With variants the server derives `stock`, so it is not sent. */
export function toRequestBody(
  v: ProductFormValues,
  { admin }: { admin: boolean }
) {
  return {
    name: v.name,
    description: v.description,
    brand: v.brand,
    categoryId: v.categoryId,
    status: v.status,
    highlights: v.highlights.map((h) => h.value),
    price: v.price,
    mrp: v.mrp,
    ...(v.variants.length ? {} : { stock: v.stock }),
    sku: v.sku,
    variants: v.variants.map((x) => ({
      sku: x.sku,
      price: x.price,
      stock: x.stock,
      ...(x.color ? { color: x.color } : {}),
      ...(x.size ? { size: x.size } : {}),
    })),
    images: v.images.map((i) => ({
      url: i.url,
      ...(i.alt ? { alt: i.alt } : {}),
    })),
    specs: v.specs,
    ...(v.slug ? { slug: v.slug } : {}),
    tags: v.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    ...(admin ? { isFeatured: v.isFeatured } : {}),
  }
}

/** An API error path -> the form field that owns it (`highlights.2` is the `.value` of row 2). */
export function serverPathToField(path: string): string {
  if (/^highlights\.\d+$/.test(path)) return `${path}.value`
  if (/^tags(\.|$)/.test(path)) return "tags"
  return path
}

export const TAB_OF_FIELD: Partial<
  Record<
    string,
    "general" | "pricing" | "variants" | "images" | "specs" | "seo"
  >
> = {
  name: "general",
  description: "general",
  brand: "general",
  categoryId: "general",
  status: "general",
  isFeatured: "general",
  highlights: "general",
  price: "pricing",
  mrp: "pricing",
  stock: "pricing",
  sku: "pricing",
  variants: "variants",
  images: "images",
  specs: "specs",
  slug: "seo",
  tags: "seo",
}
