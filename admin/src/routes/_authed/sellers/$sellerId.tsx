import { createFileRoute, Link } from "@tanstack/react-router"
import { queryOptions, useQuery } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import * as api from "@/features/sellers/api"
import { formatDate, formatDateTime } from "@/lib/format"
import { formatRupees } from "@/lib/money"
import { qk } from "@/lib/queryKeys"

const detailOptions = (id: string) =>
  queryOptions({
    queryKey: qk.sellers.detail(id),
    queryFn: ({ signal }) => api.getSeller(id, signal),
  })

export const Route = createFileRoute("/_authed/sellers/$sellerId")({
  staticData: { crumb: "Seller" },
  loader: ({ context, params }) => {
    void context.queryClient.prefetchQuery(detailOptions(params.sellerId))
  },
  component: SellerDetail,
})

function SellerDetail() {
  const { sellerId } = Route.useParams()
  const { data: s, error } = useQuery(detailOptions(sellerId))
  if (error) return <p role="alert">{error.message}</p>
  if (!s) return <p aria-busy>Loading seller...</p>
  return (
    <article className="flex flex-col gap-4">
      <h1 className="text-lg font-medium">
        {s.name} {s.isActive ? null : "(deactivated)"}
      </h1>
      <p className="text-sm text-muted-foreground">
        {s.email}
        {s.phone ? `, ${s.phone}` : ""}. Joined {formatDate(s.joinedAt)}; last
        sign-in {s.lastLoginAt ? formatDateTime(s.lastLoginAt) : "never"}.
      </p>
      <dl className="grid max-w-xl grid-cols-2 gap-x-6 gap-y-1 text-sm">
        <dt>Products</dt>
        <dd>
          {s.products.total} ({s.products.active} active, {s.products.draft}{" "}
          draft, {s.products.archived} archived)
        </dd>
        <dt>Sales (sold orders)</dt>
        <dd>
          {formatRupees(s.sales.revenue)} from {s.sales.units} units in{" "}
          {s.sales.orders} orders
        </dd>
        <dt>Application</dt>
        <dd>
          {s.application
            ? `${s.application.businessName}, ${s.application.status}${s.application.gstin ? `, GSTIN ${s.application.gstin}` : ""}`
            : "none on file"}
        </dd>
      </dl>
      <div className="flex gap-2">
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link to="/products" search={{ seller: s.id } as never} />}
        >
          Their products
        </Button>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link to="/users" search={{ search: s.email } as never} />}
        >
          In the users table
        </Button>
      </div>
    </article>
  )
}
