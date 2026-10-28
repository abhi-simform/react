import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"

import { getInvoice } from "../orders.api"

/**
 * "Download invoice": fetch the PDF as a Blob, point a temporary `<a download>` at an object URL,
 * click it, and REVOKE the URL afterwards (an object URL keeps the whole file in memory until it
 * is revoked or the page closes). The file name comes from `Content-Disposition`.
 */
export function useInvoiceDownload(orderId: string, orderNumber: string) {
  return useMutation({
    meta: { silent: true },
    mutationFn: async () => {
      const { blob, filename } = await getInvoice(orderId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename ?? `invoice-${orderNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      // Revoke after the browser has started the download (the click is synchronous).
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
      return a.download
    },
    onError: () =>
      toast.error("We could not download the invoice. Please try again."),
  })
}
