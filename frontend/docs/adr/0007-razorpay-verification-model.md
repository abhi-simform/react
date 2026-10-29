# ADR 0007: The server decides that an order is paid; the browser's callback is only a hint

- **Status:** accepted (Stage 11, backend B6)

**Context.** Razorpay Checkout runs in the browser. Whatever the browser reports ("payment succeeded") can be forged by the person at the keyboard.

**Decision.** The amount, the order and the currency are created server-side (`POST /payments/create-order`, idempotency key per attempt). When Checkout's handler fires, the SPA sends `razorpay_payment_id`, `razorpay_order_id` and `razorpay_signature` to `POST /payments/verify`; the server recomputes the HMAC-SHA256 with the key secret and compares in constant time. Separately, the `payment.captured` / `payment.failed` / `refund.processed` webhooks (signature over the RAW body, secret `RAZORPAY_WEBHOOK_SECRET`, events stored for idempotency) are the source of truth: a closed tab after paying still ends in "paid". Order state changes only in the server, in a transaction with stock. Locally a mock gateway posts to itself so the whole flow runs without an account; it is refused in production.

**Consequences.** (+) A forged "success" cannot mark an order paid; a lost callback does not lose a payment. (-) The UI must tolerate "paid but not yet confirmed" (it polls/subscribes to the order status). (-) The webhook URL must be public HTTPS: a deployment concern (`DEPLOY.md`), why local development needs the mock. (-) Test and live keys are separate; the checklist insists on test mode only.
