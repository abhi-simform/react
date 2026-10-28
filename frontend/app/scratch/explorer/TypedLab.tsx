import { useState } from "react"

import { List } from "@/components/common/List"
import { QuantityInput } from "@/components/common/QuantityInput"
import { Rating } from "@/components/common/Rating"
import { statusLabel } from "@/features/orders"
import { useToggle } from "@/hooks/useToggle"
import { ordersFixture } from "@/test/fixtures/orders"

// 2.5 playground: typed building blocks used with products and with orders.
export function TypedLab() {
  const [showOrders, toggleOrders] = useToggle(true)
  const [qty, setQty] = useState(1)
  return (
    <section className="border-t pt-3 text-sm md:col-span-2">
      <h2 className="font-medium">Typed components (2.5)</h2>
      <div className="my-2 flex items-center gap-3">
        <button className="border p-1" onClick={toggleOrders}>
          {showOrders ? "Hide" : "Show"} orders
        </button>
        <label className="flex items-center gap-2">
          Qty
          <QuantityInput value={qty} onValueChange={setQty} max={10} />
        </label>
        <Rating value={4.3} count={1234} size="sm" />
      </div>
      {showOrders && (
        <List
          items={ordersFixture}
          getKey={(order) => order._id}
          renderItem={(order) => (
            <>
              {order.orderNumber}: {statusLabel(order.status)}
            </>
          )}
          empty={<p>No orders</p>}
        />
      )}
    </section>
  )
}
