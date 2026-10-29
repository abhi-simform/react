/**
 * 14.9: the legal pages (they were placeholders). Plain text a small shop could start from, NOT legal advice: a
 * real launch needs a lawyer's review and the real company details. Kept as data so the page is one small component
 * and the text can be reviewed (and translated) in one file.
 */
export type PolicySection = { heading: string; body: string[] }
export type Policy = {
  title: string
  description: string
  updated: string
  sections: PolicySection[]
}

export const POLICIES: Record<string, Policy> = {
  privacy: {
    title: "Privacy policy",
    description:
      "What ShopSphere collects, why, how long we keep it and how you can see or delete it.",
    updated: "2026-10-29",
    sections: [
      {
        heading: "What we collect",
        body: [
          "Account data you give us: name, e-mail address, password (stored only as a salted hash), delivery addresses and phone number.",
          "Order data: what you bought, the amount, the delivery address, and the status of the payment. Card details are entered in Razorpay's checkout and never reach our servers.",
          "Technical data: your session (a refresh cookie, 30 days, HttpOnly), anonymous performance measurements (page speed, no personal data) and error reports. Error reports contain the technical details of the failure and your account id only: no e-mail address, no token, no search text.",
        ],
      },
      {
        heading: "Why",
        body: [
          "To run your account, deliver orders, take payments and send the e-mails you need (verification, password reset, order updates). We do not sell personal data and we do not run third-party advertising or analytics scripts.",
        ],
      },
      {
        heading: "Who else sees it",
        body: [
          "Our payment provider (Razorpay) for payments, our e-mail provider for the messages we send, our hosting and database providers, and our error-tracking provider (Sentry, for the scrubbed error reports above).",
        ],
      },
      {
        heading: "Your choices",
        body: [
          "You can change or remove your addresses and profile in your account, sign out of all devices from the Security page, and ask us to delete your account and data by writing to the address in the footer of our e-mails. Order records may be kept for as long as tax law requires.",
        ],
      },
      {
        heading: "Demo notice",
        body: [
          "ShopSphere is a demonstration store built for learning. Do not enter real payment details; only payment-provider test cards work.",
        ],
      },
    ],
  },
  returns: {
    title: "Returns and refunds",
    description:
      "How long you have to return an item, how to start a return and when you are refunded.",
    updated: "2026-10-29",
    sections: [
      {
        heading: "Returning an item",
        body: [
          "You can return most items within 7 days of delivery if they are unused and in their original packaging. Open the order in your account and choose Return; pick the items and the reason.",
          "Some items cannot be returned for hygiene or safety reasons (shown on the product page).",
        ],
      },
      {
        heading: "Cancelling an order",
        body: [
          "You can cancel an order from your account until it is packed. Stock is released immediately and a paid order is refunded.",
        ],
      },
      {
        heading: "Refunds",
        body: [
          "Refunds go back to the original payment method, normally within 5 to 7 working days after we receive and check the item. Cash-on-delivery orders are refunded by bank transfer to the account you give us.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of use",
    description: "The rules for using ShopSphere and placing orders.",
    updated: "2026-10-29",
    sections: [
      {
        heading: "Using the site",
        body: [
          "You must give accurate information, keep your password private and be old enough to form a contract where you live. We may suspend accounts that abuse the service.",
        ],
      },
      {
        heading: "Orders and prices",
        body: [
          "An order is accepted when we confirm it. Prices and stock can change; the price you see at checkout is the price you pay. If an item is unavailable after you ordered, we cancel that item and refund it.",
        ],
      },
      {
        heading: "Liability",
        body: [
          "To the extent the law allows, we are not liable for indirect losses. Nothing here limits your statutory consumer rights.",
        ],
      },
      {
        heading: "Demo notice",
        body: [
          "ShopSphere is a demonstration store built for learning. Orders are not fulfilled.",
        ],
      },
    ],
  },
}

export const policyList = Object.entries(POLICIES).map(([slug, p]) => ({
  slug,
  title: p.title,
}))
