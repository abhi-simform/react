import { createFileRoute, Link } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { ProductForm } from "@/features/products/ProductForm"
import { productDetailOptions } from "@/features/products/queries"
import { toFormValues } from "@/features/products/schema"
import { isApiError } from "@/lib/api/errors"
import { can } from "@/lib/auth/can"

export const Route = createFileRoute("/_authed/products/$productId")({
  staticData: { crumb: "Edit" },
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(productDetailOptions(params.productId)),
  // A product that does not exist OR belongs to another seller is a 404 from the API: say so.
  errorComponent: ({ error }) => (
    <section className="flex flex-col gap-3">
      <h1 className="text-lg font-medium">
        {isApiError(error) && error.status === 404
          ? "Product not found"
          : "Could not load the product"}
      </h1>
      <p className="text-muted-foreground">
        {error instanceof Error ? error.message : String(error)}
      </p>
      <Button
        variant="outline"
        className="w-fit"
        nativeButton={false}
        render={<Link to="/products" search={{}} />}
      >
        Back to products
      </Button>
    </section>
  ),
  component: EditProduct,
})

function EditProduct() {
  const { productId } = Route.useParams()
  const { user } = Route.useRouteContext()
  const { data } = useSuspenseQuery(productDetailOptions(productId))
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">{data.name}</h1>
        {can(user, "products:write") ? (
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to="/products/new" search={{ from: productId }} />}
          >
            Duplicate
          </Button>
        ) : null}
      </div>
      {/* key: switching to another product (e.g. after Duplicate -> save) starts a fresh form. */}
      <ProductForm
        key={data._id}
        productId={productId}
        defaults={toFormValues(data)}
      />
    </section>
  )
}
