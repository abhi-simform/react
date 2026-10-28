import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import { env, paymentMock, razorpayConfigured } from "../../config/env.js"
import { ApiError } from "../../utils/ApiError.js"

/**
 * The provider seam (like ImageStorage for uploads). The payment service only talks to this
 * interface; Razorpay (test or live keys) and the built-in mock gateway implement it.
 * Amounts here are PAISE (Razorpay's unit); the service converts from whole rupees.
 */
export interface PaymentGateway {
  readonly name: "razorpay" | "mock"
  /** Public key id for the browser (never the secret). */
  readonly keyId: string
  createOrder(input: { amountPaise: number; receipt: string }): Promise<{ id: string }>
  /** Checkout handler proof: HMAC_SHA256(orderId + "|" + paymentId, key_secret). */
  verifyPaymentSignature(input: {
    orderId: string
    paymentId: string
    signature: string
  }): boolean
  /** Webhook proof: HMAC_SHA256(raw request body, webhook_secret). */
  verifyWebhookSignature(rawBody: Buffer | string, signature: string): boolean
  refund(input: {
    paymentId: string
    amountPaise: number
    reason?: string
  }): Promise<{ id: string; status: "pending" | "processed" }>
}

const hmac = (secret: string, data: Buffer | string) =>
  createHmac("sha256", secret).update(data).digest("hex")

/** Constant-time compare (a plain === leaks how many leading characters matched). */
export function safeEqualHex(a: string, b: string) {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

export const signPayment = (secret: string, orderId: string, paymentId: string) =>
  hmac(secret, `${orderId}|${paymentId}`)
export const signWebhook = (secret: string, rawBody: Buffer | string) =>
  hmac(secret, rawBody)

// ---- Razorpay (test mode needs only test keys; the code is identical for live keys) ----------

type Fetch = typeof fetch

export class RazorpayGateway implements PaymentGateway {
  readonly name = "razorpay" as const
  constructor(
    readonly keyId: string,
    private keySecret: string,
    private webhookSecret: string,
    private http: Fetch = (...a) => fetch(...a)
  ) {}

  private async call<T>(path: string, body: object): Promise<T> {
    const res = await this.http(`https://api.razorpay.com/v1${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64")}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    })
    const json = (await res.json().catch(() => ({}))) as {
      error?: { description?: string; code?: string }
    } & T
    if (!res.ok)
      throw new ApiError(
        502,
        "PAYMENT_PROVIDER_ERROR",
        json.error?.description ?? "The payment provider rejected the request",
        { providerCode: json.error?.code }
      )
    return json
  }

  async createOrder({ amountPaise, receipt }: { amountPaise: number; receipt: string }) {
    const o = await this.call<{ id: string }>("/orders", {
      amount: amountPaise,
      currency: "INR",
      receipt,
    })
    return { id: o.id }
  }

  verifyPaymentSignature(i: { orderId: string; paymentId: string; signature: string }) {
    return safeEqualHex(signPayment(this.keySecret, i.orderId, i.paymentId), i.signature)
  }

  verifyWebhookSignature(rawBody: Buffer | string, signature: string) {
    return safeEqualHex(signWebhook(this.webhookSecret, rawBody), signature)
  }

  async refund({
    paymentId,
    amountPaise,
    reason,
  }: {
    paymentId: string
    amountPaise: number
    reason?: string
  }) {
    const r = await this.call<{ id: string; status: string }>(
      `/payments/${encodeURIComponent(paymentId)}/refund`,
      { amount: amountPaise, notes: reason ? { reason } : undefined }
    )
    // Razorpay answers "pending"/"processed"; "pending" settles via the refund.processed webhook.
    return {
      id: r.id,
      status: r.status === "processed" ? ("processed" as const) : ("pending" as const),
    }
  }
}

// ---- Mock gateway: Razorpay-shaped, fully local ---------------------------------------------

export const MOCK_KEY_ID = "rzp_test_mockgateway"
export const MOCK_KEY_SECRET = "mock_key_secret_not_a_real_secret"
export const MOCK_WEBHOOK_SECRET = "mock_webhook_secret_not_a_real_secret"
const rand = () => randomBytes(7).toString("hex")

export class MockGateway implements PaymentGateway {
  readonly name = "mock" as const
  readonly keyId = MOCK_KEY_ID
  async createOrder() {
    return { id: `order_mock_${rand()}` }
  }
  verifyPaymentSignature(i: { orderId: string; paymentId: string; signature: string }) {
    return safeEqualHex(signPayment(MOCK_KEY_SECRET, i.orderId, i.paymentId), i.signature)
  }
  verifyWebhookSignature(rawBody: Buffer | string, signature: string) {
    return safeEqualHex(signWebhook(MOCK_WEBHOOK_SECRET, rawBody), signature)
  }
  async refund() {
    return { id: `rfnd_mock_${rand()}`, status: "processed" as const }
  }
}

let current: PaymentGateway | null | undefined
/** null = payments are not configured (production without keys). */
export function getGateway(): PaymentGateway | null {
  if (current !== undefined) return current
  if (paymentMock) current = new MockGateway()
  else if (razorpayConfigured)
    current = new RazorpayGateway(
      env.RAZORPAY_KEY_ID!,
      env.RAZORPAY_KEY_SECRET!,
      env.RAZORPAY_WEBHOOK_SECRET ?? ""
    )
  else current = null
  return current
}
/** Tests replace the gateway here. */
export const setGateway = (g: PaymentGateway | null | undefined) => {
  current = g
}

/** Secrets used to SIGN simulated events/handler payloads (mock gateway and the dev webhook tool). */
export const mockSecrets = {
  keySecret: MOCK_KEY_SECRET,
  webhookSecret: MOCK_WEBHOOK_SECRET,
}
