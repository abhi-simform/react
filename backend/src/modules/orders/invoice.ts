import PDFDocument from "pdfkit"
import type { Response } from "express"
import type { OrderDoc } from "./order.model.js"

const rs = (n: number) => `Rs ${n.toLocaleString("en-IN")}`

/** Stream a simple tax invoice (PDF) for an order. Money is whole rupees; tax is exclusive. */
export function streamInvoice(res: Response, order: OrderDoc) {
  const doc = new PDFDocument({ size: "A4", margin: 48 })
  res.setHeader("Content-Type", "application/pdf")
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="invoice-${order.orderNumber}.pdf"`
  )
  res.setHeader("Cache-Control", "private, no-store")
  doc.pipe(res)

  doc.fontSize(20).text("ShopSphere", { continued: false })
  doc.fontSize(10).fillColor("#555").text("Tax invoice").fillColor("#000")
  doc.moveDown()
  doc.fontSize(10)
  doc.text(`Invoice no: INV-${order.orderNumber}`)
  doc.text(`Order no: ${order.orderNumber}`)
  doc.text(`Order date: ${order.createdAt.toISOString().slice(0, 10)}`)
  doc.text(
    `Payment: ${order.payment?.method === "cod" ? "Cash on delivery" : "Online"} (${order.payment?.status})`
  )
  doc.moveDown()

  const a = order.addressSnapshot
  doc.font("Helvetica-Bold").text("Ship to").font("Helvetica")
  doc.text(a?.fullName ?? "")
  doc.text([a?.line1, a?.line2, a?.landmark].filter(Boolean).join(", "))
  doc.text(`${a?.city ?? ""}, ${a?.state ?? ""} ${a?.pincode ?? ""}`)
  doc.text(`Phone: ${a?.phone ?? ""}`)
  doc.moveDown()

  const col = { item: 48, qty: 330, price: 390, total: 470 }
  const y0 = doc.y
  doc.font("Helvetica-Bold")
  doc.text("Item", col.item, y0)
  doc.text("Qty", col.qty, y0)
  doc.text("Price", col.price, y0)
  doc.text("Amount", col.total, y0)
  doc.font("Helvetica")
  doc
    .moveTo(48, doc.y + 2)
    .lineTo(547, doc.y + 2)
    .stroke()
  doc.moveDown(0.5)
  for (const i of order.items) {
    const y = doc.y
    doc.text(i.title, col.item, y, { width: 270 })
    const after = doc.y
    doc.text(String(i.qty), col.qty, y)
    doc.text(rs(i.unitPrice), col.price, y)
    doc.text(rs(i.lineTotal), col.total, y)
    doc.y = after
    doc.moveDown(0.3)
  }
  doc.moveDown()
  const p = order.pricing
  const line = (label: string, value: string, bold = false) => {
    const y = doc.y
    doc.font(bold ? "Helvetica-Bold" : "Helvetica")
    doc.text(label, 330, y)
    doc.text(value, col.total, y)
  }
  line("Subtotal", rs(p.subtotal))
  if (p.discount)
    line(
      `Discount${order.coupon?.code ? ` (${order.coupon.code})` : ""}`,
      `- ${rs(p.discount)}`
    )
  line("Shipping", p.shipping ? rs(p.shipping) : "Free")
  line("GST (18%)", rs(p.tax))
  doc.moveDown(0.3)
  line("Total", rs(p.total), true)
  doc.font("Helvetica").moveDown(2)
  doc
    .fontSize(8)
    .fillColor("#666")
    .text(
      "This is a computer-generated invoice. Thank you for shopping with ShopSphere.",
      48
    )
  doc.end()
}
