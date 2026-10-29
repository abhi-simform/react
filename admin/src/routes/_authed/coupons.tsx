import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CouponDialog } from "@/features/marketing/CouponDialog"
import { describeCoupon } from "@/features/marketing/couponSchema"
import * as api from "@/features/marketing/api"
import type { Coupon } from "@/features/marketing/types"
import { requirePermission } from "@/lib/auth/guards"
import { formatDate } from "@/lib/format"
import { qk } from "@/lib/queryKeys"

const couponsOptions = () =>
  queryOptions({ queryKey: qk.marketing.coupons(), queryFn: api.listCoupons })

export const Route = createFileRoute("/_authed/coupons")({
  staticData: { crumb: "Coupons" },
  beforeLoad: ({ context }) =>
    requirePermission(context.user, "marketing:manage"),
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(couponsOptions())
  },
  component: CouponsPage,
})

function status(c: Coupon) {
  const now = Date.now()
  if (!c.isActive) return "off"
  if (c.startsAt && new Date(c.startsAt).getTime() > now) return "scheduled"
  if (c.expiresAt && new Date(c.expiresAt).getTime() < now) return "expired"
  if (c.usageLimit && c.usedCount >= c.usageLimit) return "used up"
  return "live"
}

function CouponsPage() {
  const { data, error, refetch } = useQuery(couponsOptions())
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Coupon | "new" | null>(null)
  const toggle = useMutation({
    mutationFn: (c: Coupon) =>
      api.updateCoupon(c._id, { isActive: !c.isActive }),
    onSuccess: (c) =>
      toast.success(`${c.code} is now ${c.isActive ? "on" : "off"}`),
    onError: (e) => toast.error(e.message),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: qk.marketing.coupons() }),
  })
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">Coupons</h1>
        <Button onClick={() => setEditing("new")}>New coupon</Button>
      </div>
      {error ? (
        <div role="alert">
          {error.message}{" "}
          <Button size="sm" variant="outline" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : null}
      <Table>
        <caption className="sr-only">Coupons</caption>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Offer</TableHead>
            <TableHead>Validity</TableHead>
            <TableHead>Used</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-6 text-center">
                No coupons yet.
              </TableCell>
            </TableRow>
          ) : null}
          {data?.map((c) => (
            <TableRow key={c._id}>
              <TableCell className="font-mono">{c.code}</TableCell>
              <TableCell>{describeCoupon(c)}</TableCell>
              <TableCell>
                {c.startsAt ? formatDate(c.startsAt) : "any time"}
                {" to "}
                {c.expiresAt ? formatDate(c.expiresAt) : "no end"}
              </TableCell>
              <TableCell>
                {c.usedCount}
                {c.usageLimit ? ` / ${c.usageLimit}` : ""}
              </TableCell>
              <TableCell>
                <Badge variant={status(c) === "live" ? "default" : "secondary"}>
                  {status(c)}
                </Badge>
              </TableCell>
              <TableCell className="flex gap-1">
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setEditing(c)}
                >
                  Edit
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  disabled={toggle.isPending}
                  onClick={() => toggle.mutate(c)}
                >
                  {c.isActive ? "Switch off" : "Switch on"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {editing ? (
        <CouponDialog
          coupon={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </section>
  )
}
