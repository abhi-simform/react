import { formatDate, formatRupees } from "@/lib/format"
import type { Order, ReturnStatus as Status } from "@/types/domain"

import { RETURN_REASONS, type ReturnReason } from "../schemas"

const LABEL: Record<Status, string> = {
  requested: "Return requested",
  approved: "Return approved, pickup arranged",
  rejected: "Return rejected",
  refunded: "Refund issued",
}

/** The return as a status timeline (the order's `returnRequest.history`). */
export function ReturnStatus({ order }: { order: Order }) {
  const r = order.returnRequest
  if (!r) return null
  const reason = RETURN_REASONS[r.reason as ReturnReason] ?? r.reason
  return (
    <section
      aria-labelledby="return-heading"
      className="mb-4 rounded border p-3 text-sm"
    >
      <h2 id="return-heading" className="font-medium">
        Return
      </h2>
      <p>
        {reason}
        {r.note ? `: ${r.note}` : ""}. Refund due:{" "}
        <strong>
          {r.refundAmount !== undefined
            ? formatRupees(r.refundAmount)
            : "to be calculated"}
        </strong>
      </p>
      <ul className="list-disc ps-5">
        {r.items.map((i) => (
          <li key={i.productId}>
            {i.title} x {i.qty}
          </li>
        ))}
      </ul>
      {r.photos.length > 0 && (
        <ul className="my-1 flex gap-2" aria-label="Photos you sent">
          {r.photos.map((u) => (
            <li key={u}>
              <img
                src={u}
                alt="Return evidence"
                className="size-14 rounded border object-cover"
              />
            </li>
          ))}
        </ul>
      )}
      <ol aria-label="Return status" className="mt-1">
        {r.history.map((h, i) => (
          <li
            key={h.status + h.at}
            aria-current={i === r.history.length - 1 ? "step" : undefined}
          >
            {LABEL[h.status]}, {formatDate(h.at)}
            {h.note && h.status !== "requested" ? ` (${h.note})` : ""}
          </li>
        ))}
      </ol>
    </section>
  )
}
