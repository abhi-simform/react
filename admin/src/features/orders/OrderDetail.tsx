import { useState } from "react"
import { getRouteApi, Link } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDateTime } from "@/lib/format"
import { formatRupees } from "@/lib/money"
import { qk } from "@/lib/queryKeys"
import { addNote, getSellerOrder } from "./api"
import { OrderStatusBar } from "./OrderStatusBar"
import { orderDetailOptions, useChangeStatus } from "./queries"
import { RefundDialog } from "./RefundDialog"
import { StatusBadge } from "./StatusBadge"
import { STATUS_LABEL } from "./transitions"
import type { Address, HistoryEntry, OrderItem } from "./types"

const route = getRouteApi("/_authed/orders/$orderId")

export function OrderDetailPage() {
  const { user } = route.useRouteContext()
  return user.role === "admin" ? <AdminOrderDetail /> : <SellerOrderDetail />
}

function AddressBlock({ a }: { a: Address | null }) {
  if (!a) return <p className="text-muted-foreground">No address</p>
  return (
    <address className="not-italic">
      {a.fullName}
      <br />
      {[a.line1, a.line2, a.landmark].filter(Boolean).join(", ")}
      <br />
      {a.city}, {a.state} {a.pincode}
      <br />
      {a.phone}
    </address>
  )
}

function Items({ items }: { items: OrderItem[] }) {
  return (
    <Table>
      <caption className="sr-only">Items</caption>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead className="text-right">Qty</TableHead>
          <TableHead className="text-right">Unit</TableHead>
          <TableHead className="text-right">Line total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((i) => (
          <TableRow key={i.productId}>
            <TableCell>
              {i.title} {i.deal ? <Badge variant="outline">deal</Badge> : null}
            </TableCell>
            <TableCell>{i.sku}</TableCell>
            <TableCell className="text-right">{i.qty}</TableCell>
            <TableCell className="text-right">
              {formatRupees(i.unitPrice)}
            </TableCell>
            <TableCell className="text-right">
              {formatRupees(i.lineTotal)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/** Newest last, like a log. `Intl.DateTimeFormat` for the stamps. */
function Timeline({ history }: { history: HistoryEntry[] }) {
  return (
    <ol
      aria-label="Order timeline"
      className="flex flex-col gap-2 border-l pl-4"
    >
      {history.map((h, i) => (
        <li key={`${h.status}-${h.at}-${i}`}>
          <span className="font-medium">
            {h.status in STATUS_LABEL
              ? STATUS_LABEL[h.status as keyof typeof STATUS_LABEL]
              : h.status}
          </span>{" "}
          <time dateTime={h.at} className="text-sm text-muted-foreground">
            {formatDateTime(h.at)}
          </time>
          {h.note ? <p className="text-sm">{h.note}</p> : null}
        </li>
      ))}
    </ol>
  )
}

function AdminOrderDetail() {
  const { orderId } = route.useParams()
  const { data: order, error, refetch } = useQuery(orderDetailOptions(orderId))
  const change = useChangeStatus(orderId)
  const queryClient = useQueryClient()
  const [refunding, setRefunding] = useState(false)
  const [note, setNote] = useState("")
  const addNoteMutation = useMutation({
    mutationFn: (text: string) => addNote(orderId, text),
    onSuccess: () => {
      setNote("")
      toast.success("Note added")
      void queryClient.invalidateQueries({
        queryKey: qk.orders.detail(orderId),
      })
    },
    onError: (e) => toast.error(e.message),
  })

  if (error)
    return (
      <div role="alert" className="flex flex-col gap-2">
        <p>{error.message}</p>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    )
  if (!order) return <p aria-busy>Loading order...</p>
  const pay = order.payment
  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-medium">
            Order {order.orderNumber} <StatusBadge status={order.status} />
          </h1>
          <p className="text-sm text-muted-foreground">
            Placed {formatDateTime(order.createdAt)}
          </p>
        </div>
        <OrderStatusBar
          status={order.status}
          orderNumber={order.orderNumber}
          busy={change.isPending}
          onSubmit={(input) => change.mutate(input)}
        />
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <section aria-labelledby="cust">
          <h2 id="cust" className="mb-1 font-medium">
            Customer
          </h2>
          <p>{order.customer?.name}</p>
          <p className="text-sm text-muted-foreground">
            {order.customer?.email}
          </p>
        </section>
        <section aria-labelledby="ship-to">
          <h2 id="ship-to" className="mb-1 font-medium">
            Ship to
          </h2>
          <AddressBlock a={order.addressSnapshot} />
          {order.delivery?.slot ? (
            <p className="mt-1 text-sm">Slot: {order.delivery.slot}</p>
          ) : null}
        </section>
        <section aria-labelledby="shipment">
          <h2 id="shipment" className="mb-1 font-medium">
            Shipment
          </h2>
          {order.shipment ? (
            <p>
              {order.shipment.carrier}, tracking {order.shipment.trackingId}
            </p>
          ) : (
            <p className="text-muted-foreground">Not shipped yet</p>
          )}
          {order.cancelReason ? (
            <p className="mt-1 text-sm">Cancelled: {order.cancelReason}</p>
          ) : null}
        </section>
      </div>

      <section aria-labelledby="items">
        <h2 id="items" className="mb-1 font-medium">
          Items
        </h2>
        <Items items={order.items} />
        <dl className="mt-2 ml-auto grid w-64 grid-cols-2 gap-x-4 text-sm">
          <dt>Subtotal</dt>
          <dd className="text-right">{formatRupees(order.pricing.subtotal)}</dd>
          <dt>Discount{order.coupon ? ` (${order.coupon.code})` : ""}</dt>
          <dd className="text-right">
            -{formatRupees(order.pricing.discount)}
          </dd>
          <dt>Shipping</dt>
          <dd className="text-right">{formatRupees(order.pricing.shipping)}</dd>
          <dt>Tax</dt>
          <dd className="text-right">{formatRupees(order.pricing.tax)}</dd>
          <dt className="font-medium">Total</dt>
          <dd className="text-right font-medium">
            {formatRupees(order.pricing.total)}
          </dd>
        </dl>
      </section>

      <section aria-labelledby="payment">
        <h2 id="payment" className="mb-1 font-medium">
          Payment
        </h2>
        <p>
          {order.paymentMethod.toUpperCase()}:{" "}
          <Badge variant="outline">
            {order.paymentStatus.replaceAll("_", " ")}
          </Badge>
        </p>
        {pay ? (
          <div className="mt-2 flex flex-col gap-2 text-sm">
            <p>
              {pay.provider} payment of {formatRupees(pay.amount)}
              {pay.method ? ` by ${pay.method}` : ""}; refunded{" "}
              {formatRupees(pay.refundedAmount)}.
            </p>
            {pay.refunds.length > 0 ? (
              <ul className="list-disc pl-5">
                {pay.refunds.map((r, i) => (
                  <li key={i}>
                    {formatRupees(r.amount)} {r.status},{" "}
                    {r.reason ?? "no reason"} ({formatDateTime(r.createdAt)})
                  </li>
                ))}
              </ul>
            ) : null}
            {pay.refundable > 0 ? (
              <div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setRefunding(true)}
                >
                  Refund payment...
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {order.returnRequest ? (
        <section aria-labelledby="return">
          <h2 id="return" className="mb-1 font-medium">
            Return: {order.returnRequest.status}
          </h2>
          <p className="text-sm">
            {order.returnRequest.reason.replaceAll("_", " ").toLowerCase()}
            {order.returnRequest.note ? `: ${order.returnRequest.note}` : ""}.
            Refund due{" "}
            {order.returnRequest.refundAmount === null
              ? "n/a"
              : formatRupees(order.returnRequest.refundAmount)}
            .
          </p>
          <p className="text-sm text-muted-foreground">
            <Link to="/returns" search={{ page: 1, pageSize: 20 }}>
              Open the returns queue
            </Link>
          </p>
        </section>
      ) : null}

      <section aria-labelledby="timeline">
        <h2 id="timeline" className="mb-2 font-medium">
          Timeline
        </h2>
        <Timeline history={order.statusHistory} />
      </section>

      <section aria-labelledby="notes">
        <h2 id="notes" className="mb-2 font-medium">
          Internal notes
        </h2>
        <ul className="mb-3 flex flex-col gap-1 text-sm">
          {order.staffNotes.length === 0 ? (
            <li className="text-muted-foreground">No notes yet.</li>
          ) : null}
          {order.staffNotes.map((n, i) => (
            <li key={i}>
              {n.text}{" "}
              <span className="text-muted-foreground">
                {n.by} {formatDateTime(n.at)}
              </span>
            </li>
          ))}
        </ul>
        <form
          className="flex max-w-xl flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (note.trim()) addNoteMutation.mutate(note.trim())
          }}
        >
          <Label htmlFor="note">Add a note (customers never see it)</Label>
          <Textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div>
            <Button
              type="submit"
              size="sm"
              disabled={!note.trim() || addNoteMutation.isPending}
            >
              Add note
            </Button>
          </div>
        </form>
      </section>

      {refunding && pay ? (
        <RefundDialog
          payment={pay}
          orderId={order.id}
          onClose={() => setRefunding(false)}
        />
      ) : null}
    </article>
  )
}

function SellerOrderDetail() {
  const { orderId } = route.useParams()
  const { data: order, error } = useQuery({
    queryKey: qk.orders.detail(`seller:${orderId}`),
    queryFn: ({ signal }) => getSellerOrder(orderId, signal),
  })
  if (error)
    return (
      <p role="alert">
        {error.message} (orders without a line of yours are not visible)
      </p>
    )
  if (!order) return <p aria-busy>Loading order...</p>
  return (
    <article className="flex flex-col gap-6">
      <h1 className="text-lg font-medium">
        Order {order.orderNumber} <StatusBadge status={order.status} />
      </h1>
      <p className="text-sm text-muted-foreground">
        Placed {formatDateTime(order.createdAt)}. You see only your own lines.
      </p>
      <section aria-labelledby="s-items">
        <h2 id="s-items" className="mb-1 font-medium">
          Your items ({order.units} units, {formatRupees(order.yourTotal)})
        </h2>
        <Items items={order.items} />
      </section>
      <section aria-labelledby="s-ship">
        <h2 id="s-ship" className="mb-1 font-medium">
          Ship to
        </h2>
        <AddressBlock a={order.addressSnapshot} />
        {order.shipment ? (
          <p className="mt-1">
            {order.shipment.carrier}, tracking {order.shipment.trackingId}
          </p>
        ) : null}
      </section>
      <Timeline history={order.statusHistory} />
    </article>
  )
}
