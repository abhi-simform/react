import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query"
import { toast } from "sonner"

import type { Paginated } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"
import { qk } from "@/lib/queryKeys"
import * as api from "./api"
import type { ProductRow } from "./types"

export const productListOptions = (params: api.ProductListParams) =>
  queryOptions({
    queryKey: qk.products.list(params),
    queryFn: ({ signal }) => api.listProducts(params, signal),
    placeholderData: keepPreviousData, // page changes keep the old rows on screen (no empty flash)
  })

export const productDetailOptions = (id: string) =>
  queryOptions({
    queryKey: qk.products.detail(id),
    queryFn: ({ signal }) => api.getProduct(id, signal),
  })

type ListCache = Paginated<ProductRow>

/**
 * Optimistic inline edit (price / stock). onMutate patches the row in EVERY cached list at once,
 * onError puts the snapshots back and says why (toast), onSettled refetches the truth.
 */
export function useInlineProductEdit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string
      patch: { price?: number; stock?: number }
    }) => api.updateProduct(id, patch),
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: qk.products.all() })
      const snapshots = queryClient.getQueriesData<ListCache>({
        queryKey: qk.products.all(),
      })
      queryClient.setQueriesData<ListCache>(
        { queryKey: qk.products.all() },
        (old) =>
          old && Array.isArray(old.items)
            ? {
                ...old,
                items: old.items.map((r) =>
                  r._id === id ? { ...r, ...patch } : r
                ),
              }
            : old
      )
      return { snapshots }
    },
    onError: (err, vars, ctx) => {
      ctx?.snapshots.forEach(([key, data]: [QueryKey, unknown]) =>
        queryClient.setQueryData(key, data)
      )
      const why = isApiError(err)
        ? Object.values(err.fieldErrors).join(", ") || err.message
        : err.message
      toast.error(`Could not save ${Object.keys(vars.patch)[0]}: ${why}`)
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: qk.products.all() }),
  })
}

export function useArchiveProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.archiveProduct,
    onSuccess: (p) => toast.success(`Archived "${p.name}"`),
    onError: (err) => toast.error(err.message),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: qk.products.all() }),
  })
}

export function useBulkStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: string }) =>
      api.bulkSetStatus(ids, status),
    onSuccess: (r) => toast.success(`${r.modified} product(s) updated`),
    onError: (err) => toast.error(err.message),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: qk.products.all() }),
  })
}
