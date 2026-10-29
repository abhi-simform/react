import { createFileRoute } from "@tanstack/react-router"
import { OrderDetailPage } from "@/features/orders/OrderDetail"
import { orderDetailOptions } from "@/features/orders/queries"

export const Route = createFileRoute("/_authed/orders/$orderId")({
  staticData: { crumb: "Order" },
  loader: ({ context, params }) => {
    if (context.user.role === "admin")
      void context.queryClient.prefetchQuery(orderDetailOptions(params.orderId))
  },
  component: OrderDetailPage,
})
