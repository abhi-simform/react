import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { ProductForm } from "@/features/products/ProductForm"
import { productDetailOptions } from "@/features/products/queries"
import { emptyProduct, toFormValues } from "@/features/products/schema"
import { requirePermission } from "@/lib/auth/guards"

export const Route = createFileRoute("/_authed/products/new")({
  staticData: { crumb: "New" },
  // `?from=<id>` = "Duplicate product": prefill from that product, as a draft with a new SKU.
  validateSearch: z.object({ from: z.string().optional() }),
  beforeLoad: ({ context }) =>
    requirePermission(context.user, "products:write"),
  loaderDeps: ({ search }) => ({ from: search.from }),
  loader: async ({ context, deps }) => {
    if (!deps.from) return { defaults: emptyProduct }
    const p = await context.queryClient.ensureQueryData(
      productDetailOptions(deps.from)
    )
    return {
      defaults: {
        ...toFormValues(p),
        name: `${p.name} (copy)`,
        sku: `${p.sku}-COPY`,
        slug: "", // a new slug is generated from the new name
        status: "draft" as const,
        variants: toFormValues(p).variants.map((v) => ({
          ...v,
          sku: `${v.sku}-COPY`,
        })),
      },
    }
  },
  component: NewProduct,
})

function NewProduct() {
  const { defaults } = Route.useLoaderData()
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-lg font-medium">New product</h1>
      <ProductForm defaults={defaults} />
    </section>
  )
}
