import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { listProducts } from "@/features/products/api"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { isApiError } from "@/lib/api/errors"
import { formatRupees } from "@/lib/money"
import { qk } from "@/lib/queryKeys"
import { createDeal, updateDeal } from "./api"
import { findDealOverlap, fromIstLocal, toIstLocal } from "./dates"
import { dealFormSchema, toDealBody, type DealFormValues } from "./dealSchema"
import type { Deal } from "./types"

const num = (v: unknown) => (v === "" ? Number.NaN : Number(v))

export function DealDialog({
  deal,
  deals,
  onClose,
}: {
  deal: Deal | null
  /** Every known deal: the overlap check runs here, before the request, and again in the API. */
  deals: Deal[]
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const q = useDebouncedValue(search.trim(), 250)
  const [picked, setPicked] = useState<{
    id: string
    name: string
    price: number
  } | null>(
    deal?.productInfo
      ? {
          id: deal.productInfo.id,
          name: deal.productInfo.name,
          price: deal.productInfo.price,
        }
      : null
  )
  const results = useQuery({
    queryKey: ["deal-product-search", q],
    queryFn: ({ signal }) =>
      listProducts(
        {
          search: q,
          status: "active",
          sort: "name",
          order: "asc",
          page: 1,
          limit: 6,
        },
        signal
      ),
    enabled: !deal && q.length >= 2,
  })

  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealFormSchema),
    defaultValues: deal
      ? {
          productId: deal.product,
          dealPrice: deal.dealPrice,
          stockLimit: deal.stockLimit,
          startsAt: toIstLocal(deal.startsAt),
          endsAt: toIstLocal(deal.endsAt),
          badge: deal.badge ?? "",
          isActive: deal.isActive,
        }
      : {
          productId: "",
          dealPrice: 0,
          stockLimit: 10,
          startsAt: "",
          endsAt: "",
          badge: "",
          isActive: true,
        },
  })
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    formState: { errors },
  } = form
  const w = useWatch({ control })

  const save = useMutation({
    mutationFn: (v: DealFormValues) =>
      deal
        ? updateDeal(deal._id, toDealBody(v, true))
        : createDeal(toDealBody(v, false)),
    onSuccess: async () => {
      toast.success(deal ? "Deal saved" : "Deal created")
      await queryClient.invalidateQueries({ queryKey: qk.marketing.deals() })
      onClose()
    },
    onError: (e) => {
      if (isApiError(e) && Object.keys(e.fieldErrors).length) {
        for (const [path, message] of Object.entries(e.fieldErrors))
          setError(path as keyof DealFormValues, { type: "server", message })
      } else toast.error(e.message)
    },
  })

  const onValid = (v: DealFormValues) => {
    // Overlap detection, client side first (instant, names the clashing window); the API is the authority.
    if (v.isActive) {
      const clash = findDealOverlap(
        deals.map((d) => ({
          id: d._id,
          productId: d.product,
          startsAt: d.startsAt,
          endsAt: d.endsAt,
          isActive: d.isActive,
        })),
        v.productId,
        { startsAt: fromIstLocal(v.startsAt), endsAt: fromIstLocal(v.endsAt) },
        deal?._id
      )
      if (clash)
        return setError("startsAt", {
          type: "overlap",
          message: `Overlaps another active deal on this product (${toIstLocal(clash.startsAt).replace("T", " ")} to ${toIstLocal(clash.endsAt).replace("T", " ")})`,
        })
    }
    if (picked && v.dealPrice >= picked.price)
      return setError("dealPrice", {
        message: `Must be below the regular price (${formatRupees(picked.price)})`,
      })
    save.mutate(v)
  }

  const err = (k: keyof DealFormValues) => errors[k]?.message
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{deal ? "Edit deal" : "New deal"}</DialogTitle>
          <DialogDescription>
            Times are India time. Two active deals on one product cannot
            overlap.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          noValidate
          onSubmit={handleSubmit(onValid)}
        >
          {deal ? (
            <p className="text-sm">
              Product: <strong>{picked?.name}</strong> (regular{" "}
              {picked ? formatRupees(picked.price) : ""})
            </p>
          ) : (
            <>
              <Label htmlFor="d-search">Product</Label>
              <Input
                id="d-search"
                type="search"
                placeholder="Search active products (2+ letters)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {picked ? (
                <p className="text-sm">
                  Selected: <strong>{picked.name}</strong> (regular{" "}
                  {formatRupees(picked.price)})
                </p>
              ) : null}
              <ul aria-label="Product matches" className="flex flex-col gap-1">
                {results.data?.items.map((p) => (
                  <li key={p._id}>
                    <Button
                      type="button"
                      size="sm"
                      variant={picked?.id === p._id ? "default" : "outline"}
                      onClick={() => {
                        setPicked({ id: p._id, name: p.name, price: p.price })
                        setValue("productId", p._id, { shouldValidate: true })
                      }}
                    >
                      {p.name} ({formatRupees(p.price)})
                    </Button>
                  </li>
                ))}
              </ul>
              {err("productId") ? (
                <p role="alert" className="text-sm text-destructive">
                  {err("productId")}
                </p>
              ) : null}
            </>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="d-price">Deal price (₹)</Label>
              <Input
                id="d-price"
                inputMode="numeric"
                {...register("dealPrice", { setValueAs: num })}
                aria-invalid={!!errors.dealPrice}
              />
              {err("dealPrice") ? (
                <p role="alert" className="text-sm text-destructive">
                  {err("dealPrice")}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="d-stock">Units at this price</Label>
              <Input
                id="d-stock"
                inputMode="numeric"
                {...register("stockLimit", { setValueAs: num })}
                aria-invalid={!!errors.stockLimit}
              />
              {err("stockLimit") ? (
                <p role="alert" className="text-sm text-destructive">
                  {err("stockLimit")}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="d-start">Starts (IST)</Label>
              <Input
                id="d-start"
                type="datetime-local"
                {...register("startsAt")}
                aria-invalid={!!errors.startsAt}
              />
              {err("startsAt") ? (
                <p role="alert" className="text-sm text-destructive">
                  {err("startsAt")}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="d-end">Ends (IST)</Label>
              <Input
                id="d-end"
                type="datetime-local"
                {...register("endsAt")}
                aria-invalid={!!errors.endsAt}
              />
              {err("endsAt") ? (
                <p role="alert" className="text-sm text-destructive">
                  {err("endsAt")}
                </p>
              ) : null}
            </div>
          </div>
          <Label htmlFor="d-badge">Badge (optional)</Label>
          <Input id="d-badge" {...register("badge")} placeholder="Flash sale" />
          <Label className="gap-2">
            <Checkbox
              checked={!!w.isActive}
              onCheckedChange={(v) => setValue("isActive", !!v)}
            />
            Active (switched on)
          </Label>
          <DialogFooter>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving..." : "Save deal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
