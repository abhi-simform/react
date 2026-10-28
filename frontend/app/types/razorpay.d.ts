/**
 * Types for Razorpay Standard Checkout (`https://checkout.razorpay.com/v1/checkout.js`), which
 * ships no typings. Only what we use. The script adds `window.Razorpay` when it loads.
 */
export {}

declare global {
  /** What `handler` receives after a successful payment: forward it to OUR server, never trust it. */
  interface RazorpaySuccessResponse {
    razorpay_payment_id: string
    razorpay_order_id: string
    razorpay_signature: string
  }

  interface RazorpayFailureResponse {
    error: {
      code: string
      description: string
      source?: string
      step?: string
      reason?: string
      metadata?: { order_id?: string; payment_id?: string }
    }
  }

  interface RazorpayOptions {
    /** The PUBLIC key id (rzp_test_... / rzp_live_...). The secret never reaches the browser. */
    key: string
    /** Paise. */
    amount: number
    currency: string
    name: string
    description?: string
    order_id: string
    prefill?: { name?: string; email?: string; contact?: string }
    theme?: { color?: string }
    handler: (response: RazorpaySuccessResponse) => void
    modal?: {
      ondismiss?: () => void
      escape?: boolean
      confirm_close?: boolean
    }
  }

  interface RazorpayInstance {
    open(): void
    close(): void
    on(
      event: "payment.failed",
      callback: (r: RazorpayFailureResponse) => void
    ): void
  }

  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance
  }
}
