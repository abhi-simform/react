import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"

import { isApiError } from "@/lib/api/errors"
import { qk } from "@/lib/queryKeys"
import * as api from "./api"

export const orderListOptions = (p: api.OrderListParams) =>
  queryOptions({
    queryKey: qk.orders.list(p),
    queryFn: ({ signal }) => api.listOrders(p, signal),
    placeholderData: keepPreviousData,
  })
export const orderDetailOptions = (id: string) =>
  queryOptions({
    queryKey: qk.orders.detail(id),
    queryFn: ({ signal }) => api.getOrder(id, signal),
  })

/** Status moves: on success refresh every order query (list rows, detail, timeline) and the dashboard. */
export function useChangeStatus(orderId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: api.StatusInput) => api.changeStatus(orderId, input),
    onSuccess: (o) =>
      toast.success(
        `Order ${o.orderNumber} is now ${o.status.replaceAll("_", " ")}`
      ),
    // 409 INVALID_TRANSITION / ORDER_CHANGED / 422 messages from the API are shown as they are.
    onError: (e) =>
      toast.error(
        isApiError(e)
          ? [e.message, ...Object.values(e.fieldErrors)].join(": ")
          : e.message
      ),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: qk.orders.all() })
      await queryClient.invalidateQueries({ queryKey: qk.analytics.all() })
    },
  })
}
