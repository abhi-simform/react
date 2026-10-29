import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
import * as api from "@/features/marketing/api"
import { DealDialog } from "@/features/marketing/DealDialog"
import type { Deal } from "@/features/marketing/types"
import { requirePermission } from "@/lib/auth/guards"
import { formatDateTime } from "@/lib/format"
import { formatRupees } from "@/lib/money"
import { qk } from "@/lib/queryKeys"

const dealsOptions = () =>
  queryOptions({ queryKey: qk.marketing.deals(), queryFn: api.listDeals })

export const Route = createFileRoute("/_authed/deals")({
  staticData: { crumb: "Deals" },
  beforeLoad: ({ context }) =>
    requirePermission(context.user, "marketing:manage"),
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(dealsOptions())
  },
  component: DealsPage,
})

function phase(d: Deal) {
  const now = Date.now()
  if (!d.isActive) return "off"
  if (new Date(d.startsAt).getTime() > now) return "upcoming"
  if (new Date(d.endsAt).getTime() <= now) return "ended"
  if (d.claimed >= d.stockLimit) return "sold out"
  return "live"
}

function DealsPage() {
  const { data, error, refetch } = useQuery(dealsOptions())
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Deal | "new" | null>(null)
  const [removing, setRemoving] = useState<Deal | null>(null)
  const remove = useMutation({
    mutationFn: (d: Deal) => api.deleteDeal(d._id),
    onSuccess: () => toast.success("Deal deleted"),
    onError: (e) => toast.error(e.message),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: qk.marketing.deals() }),
  })
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">Deals and flash sales</h1>
        <Button onClick={() => setEditing("new")}>New deal</Button>
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
        <caption className="sr-only">Deals</caption>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Window (IST)</TableHead>
            <TableHead>Claimed</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-6 text-center">
                No deals yet.
              </TableCell>
            </TableRow>
          ) : null}
          {data?.map((d) => (
            <TableRow key={d._id}>
              <TableCell>
                {d.productInfo?.name ?? "(deleted product)"}
              </TableCell>
              <TableCell>
                {formatRupees(d.dealPrice)}
                {d.productInfo ? (
                  <span className="ml-1 text-xs text-muted-foreground line-through">
                    {formatRupees(d.productInfo.price)}
                  </span>
                ) : null}
              </TableCell>
              <TableCell>
                {formatDateTime(d.startsAt)} to {formatDateTime(d.endsAt)}
              </TableCell>
              <TableCell>
                {d.claimed} / {d.stockLimit}
              </TableCell>
              <TableCell>
                <Badge variant={phase(d) === "live" ? "default" : "secondary"}>
                  {phase(d)}
                </Badge>
              </TableCell>
              <TableCell className="flex gap-1">
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setEditing(d)}
                >
                  Edit
                </Button>
                <Button
                  size="xs"
                  variant="destructive"
                  onClick={() => setRemoving(d)}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {editing ? (
        <DealDialog
          deal={editing === "new" ? null : editing}
          deals={data ?? []}
          onClose={() => setEditing(null)}
        />
      ) : null}
      <AlertDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this deal?</AlertDialogTitle>
            <AlertDialogDescription>
              {removing?.productInfo?.name}: orders already placed at the deal
              price are not affected. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removing) remove.mutate(removing)
                setRemoving(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
