# Razorpay real test-card payment (manual, once per release)

CI never automates the real Razorpay checkout (a third-party iframe with bank redirects and OTPs):
`e2e/payment.spec.ts` covers the UI states against the API's MOCK gateway with intercepted endpoints.
The real flow is checked by hand with Razorpay's TEST mode keys:

1. In `backend/.env` set `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` (test mode) and the webhook secret; restart the API.
   `GET /api/v1/payments/config` must now answer `"mock": false`.
2. Sign in, add a product, choose "Pay online" at checkout, place the order.
3. In the Razorpay window pay with a test card from https://razorpay.com/docs/payments/payments/test-card-details/
   (success card, then repeat with a failing card).
4. Expected: the page says "Confirming your payment..." and then shows the order as paid from the SERVER
   (not from the browser handler); a failing card shows the failure with "Retry payment".
5. Close the window without paying: "Payment not completed", order still `pending_payment`.
