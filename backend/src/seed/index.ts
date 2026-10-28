import { faker } from "@faker-js/faker"
import bcrypt from "bcryptjs"
import mongoose from "mongoose"
import { connectDb, disconnectDb } from "../config/db.js"
import { logger } from "../config/logger.js"
import { Category } from "../modules/categories/category.model.js"
import { Product } from "../modules/products/product.model.js"
import { User } from "../modules/users/user.model.js"
import { RefreshToken } from "../modules/auth/refreshToken.model.js"
import { Address } from "../modules/addresses/address.model.js"
import { WishlistItem } from "../modules/wishlist/wishlist.model.js"
import { Cart } from "../modules/cart/cart.model.js"
import { Coupon } from "../modules/coupons/coupon.model.js"
import { Deal } from "../modules/deals/deal.model.js"
import { Banner } from "../modules/banners/banner.model.js"
import { Payment, WebhookEvent } from "../modules/payments/payment.model.js"
import { Order, type OrderStatus } from "../modules/orders/order.model.js"
import { Review, Vote, maskName } from "../modules/reviews/review.model.js"
import { Answer, Question } from "../modules/reviews/qa.model.js"
import { RecentlyViewed } from "../modules/recommendations/recentlyViewed.model.js"
import { Notification } from "../modules/notifications/notification.model.js"
import { orderTemplate } from "../modules/notifications/notification.templates.js"
import { slugify } from "../utils/slugify.js"
import { CATALOG } from "./catalog.js"

// Dev-only accounts (never used outside local seeds).
const DEV_PASSWORD = "Password123"
const PRODUCTS_PER_LEAF = 22

async function main() {
  const reset = process.argv.includes("--reset")
  await connectDb()
  faker.seed(42) // deterministic: same data every run

  if (reset) {
    await mongoose.connection.dropDatabase()
    logger.warn("Database dropped")
  } else if ((await Product.estimatedDocumentCount()) > 0) {
    logger.info("Data already present. Use `npm run db:reset` to wipe and reseed.")
    return disconnectDb()
  }
  await Promise.all([
    Product.syncIndexes(),
    User.syncIndexes(),
    Category.syncIndexes(),
    RefreshToken.syncIndexes(),
    Address.syncIndexes(),
    WishlistItem.syncIndexes(),
    Cart.syncIndexes(),
    Coupon.syncIndexes(),
    Deal.syncIndexes(),
    Banner.syncIndexes(),
    Order.syncIndexes(),
    Payment.syncIndexes(),
    Review.syncIndexes(),
    Vote.syncIndexes(),
    Question.syncIndexes(),
    Answer.syncIndexes(),
    WebhookEvent.syncIndexes(),
    RecentlyViewed.syncIndexes(),
    Notification.syncIndexes(),
  ])

  // Users
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10)
  await User.insertMany([
    {
      name: "Admin User",
      email: "admin@shopsphere.dev",
      role: "admin",
      emailVerified: true,
      passwordHash,
    },
    {
      name: "Sam Seller",
      email: "seller@shopsphere.dev",
      role: "seller",
      emailVerified: true,
      passwordHash,
    },
    {
      name: "Casey Customer",
      email: "customer@shopsphere.dev",
      role: "customer",
      emailVerified: true,
      passwordHash,
    },
  ])
  const seller = await User.findOne({ role: "seller" })

  // Categories + products
  let total = 0
  for (const [i, top] of CATALOG.entries()) {
    const root = await Category.create({
      name: top.name,
      slug: slugify(top.name),
      ancestors: [],
      sortOrder: i,
      image: `https://picsum.photos/seed/cat-${slugify(top.name)}/400/300`,
    })
    for (const leaf of top.children) {
      const cat = await Category.create({
        name: leaf.name,
        slug: slugify(leaf.name),
        parent: root._id,
        ancestors: [root._id],
        image: `https://picsum.photos/seed/cat-${slugify(leaf.name)}/400/300`,
      })
      const docs = Array.from({ length: PRODUCTS_PER_LEAF }, (_, n) => {
        const brand = faker.helpers.arrayElement(leaf.brands)
        const noun = faker.helpers.arrayElement(leaf.nouns)
        const model = `${faker.string.alpha({ length: 1, casing: "upper" })}${faker.number.int({ min: 10, max: 99 })}`
        const name = `${brand} ${model} ${noun}`
        const sku = `${slugify(leaf.name).slice(0, 3).toUpperCase()}-${String(total + n + 1).padStart(5, "0")}`
        const mrp =
          Math.round(
            faker.number.int({ min: leaf.priceRange[0], max: leaf.priceRange[1] }) / 10
          ) * 10
        const discount = faker.helpers.weightedArrayElement([
          { weight: 2, value: 0 },
          { weight: 6, value: faker.number.int({ min: 5, max: 30 }) },
          { weight: 3, value: faker.number.int({ min: 31, max: 60 }) },
        ])
        const price = Math.max(1, Math.round((mrp * (100 - discount)) / 100))
        const slug = `${slugify(name)}-${sku.toLowerCase()}`
        return {
          name,
          slug,
          sku,
          brand,
          mrp,
          price,
          description:
            faker.commerce.productDescription() + " " + faker.lorem.paragraph(),
          highlights: faker.helpers.multiple(
            () =>
              faker.commerce.productAdjective() +
              " " +
              faker.commerce.productMaterial().toLowerCase() +
              " build",
            { count: 4 }
          ),
          category: cat._id,
          categoryPath: [root._id, cat._id],
          tags: [leaf.name.toLowerCase(), brand.toLowerCase(), noun.toLowerCase()],
          images: Array.from({ length: 4 }, (_, k) => ({
            url: `https://picsum.photos/seed/${slug}-${k}/800/800`,
            alt: `${name} image ${k + 1}`,
          })),
          stock: faker.helpers.weightedArrayElement([
            { weight: 1, value: 0 },
            { weight: 2, value: faker.number.int({ min: 1, max: 5 }) },
            { weight: 8, value: faker.number.int({ min: 6, max: 300 }) },
          ]),
          specs: leaf.specKeys.map((key) => ({
            key,
            value: faker.commerce.productAdjective(),
          })),
          ratingAvg:
            Math.round(faker.number.float({ min: 2.8, max: 5, fractionDigits: 1 }) * 10) /
            10,
          ratingCount: faker.number.int({ min: 0, max: 8000 }),
          soldCount: faker.number.int({ min: 0, max: 20000 }),
          isFeatured: faker.datatype.boolean({ probability: 0.12 }),
          seller: seller?._id,
        }
      })
      await Product.insertMany(docs)
      total += docs.length
    }
  }
  // B2: the dev customer gets two addresses and three wishlisted products.
  const customer = await User.findOne({ email: "customer@shopsphere.dev" })
  if (customer) {
    await Address.create([
      {
        user: customer._id,
        fullName: "Casey Customer",
        phone: "9876543210",
        line1: "12, MG Road",
        landmark: "Near Metro Station",
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "560001",
        type: "home",
        isDefault: true,
      },
      {
        user: customer._id,
        fullName: "Casey Customer",
        phone: "9876543210",
        line1: "4th Floor, Tech Park, Baner",
        city: "Pune",
        state: "Maharashtra",
        pincode: "411045",
        type: "work",
      },
    ])
    const picks = await Product.find({ status: "active" })
      .sort({ soldCount: -1 })
      .limit(3)
    await WishlistItem.insertMany(
      picks.map((p) => ({ user: customer._id, product: p._id }))
    )
    // B3: the dev customer's cart has two lines (one at a price that has since dropped, so the
    // "price changed" warning is visible) and one product saved for later.
    const inStock = await Product.find({ status: "active", stock: { $gte: 5 } })
      .sort({ soldCount: 1 })
      .limit(3)
    if (inStock.length === 3) {
      await Cart.create({
        user: customer._id,
        items: [
          { product: inStock[0]!._id, qty: 1, priceAtAdd: inStock[0]!.price },
          { product: inStock[1]!._id, qty: 2, priceAtAdd: inStock[1]!.price + 200 },
          {
            product: inStock[2]!._id,
            qty: 1,
            priceAtAdd: inStock[2]!.price,
            savedForLater: true,
          },
        ],
      })
    }
  }

  // B4: coupons, deals/flash sales and home banners (times are relative to seed time).
  const electronics = await Category.findOne({ slug: "electronics" })
  const H = 3_600_000
  const now = Date.now()
  await Coupon.insertMany([
    {
      code: "SAVE10",
      description: "10% off, up to Rs 200 (orders from Rs 500)",
      type: "percent",
      value: 10,
      maxDiscount: 200,
      minOrder: 500,
      perUserLimit: 5,
    },
    {
      code: "FLAT100",
      description: "Rs 100 off (orders from Rs 2,000)",
      type: "flat",
      value: 100,
      minOrder: 2000,
      perUserLimit: 5,
    },
    {
      code: "WELCOME50",
      description: "Rs 50 off your first order (from Rs 299)",
      type: "flat",
      value: 50,
      minOrder: 299,
      firstOrderOnly: true,
    },
    {
      code: "TECH15",
      description: "15% off Electronics, up to Rs 1,500",
      type: "percent",
      value: 15,
      maxDiscount: 1500,
      minOrder: 1000,
      categories: electronics ? [electronics._id] : [],
      perUserLimit: 3,
    },
    {
      code: "OLD50",
      description: "50% off (expired)",
      type: "percent",
      value: 50,
      startsAt: new Date(now - 90 * 24 * H),
      expiresAt: new Date(now - 24 * H),
    },
    {
      code: "LASTONE",
      description: "Rs 75 off, only one left in the world",
      type: "flat",
      value: 75,
      usageLimit: 1,
    },
  ])
  const dealPicks = await Product.find({ status: "active", stock: { $gte: 20 } })
    .sort({ soldCount: -1 })
    .limit(10)
  await Deal.insertMany(
    dealPicks.map((p, n) => ({
      product: p._id,
      dealPrice: Math.max(1, Math.round(p.price * (n % 3 === 0 ? 0.7 : 0.82))),
      startsAt: new Date(now - H),
      endsAt: new Date(now + (n < 4 ? 6 : n < 8 ? 36 : 72) * H),
      stockLimit: 10 + n * 3,
      claimed: n === 0 ? 8 : Math.floor((10 + n * 3) / 3),
      badge: n < 4 ? "Flash sale" : "Deal of the day",
    }))
  )
  const upcoming = await Product.findOne({ status: "active", stock: { $gte: 20 } })
    .sort({ soldCount: 1 })
    .skip(5)
  if (upcoming)
    await Deal.create({
      product: upcoming._id,
      dealPrice: Math.max(1, Math.round(upcoming.price * 0.6)),
      startsAt: new Date(now + 24 * H),
      endsAt: new Date(now + 48 * H),
      stockLimit: 20,
      badge: "Coming soon",
    })
  await Banner.insertMany([
    {
      title: "Flash sale is live",
      subtitle: "Up to 30% off, while stock lasts",
      imageUrl: "https://picsum.photos/seed/banner-flash/1200/400",
      linkUrl: "/deals",
      sortOrder: 1,
    },
    {
      title: "New in Electronics",
      subtitle: "Phones, laptops and audio",
      imageUrl: "https://picsum.photos/seed/banner-tech/1200/400",
      linkUrl: "/c/electronics",
      sortOrder: 2,
    },
    {
      title: "Free delivery above Rs 499",
      imageUrl: "https://picsum.photos/seed/banner-ship/1200/400",
      linkUrl: "/products",
      sortOrder: 3,
    },
  ])

  // B5: a few past orders for the dev customer so /orders has history in every state
  // (stock is NOT touched: these are historical snapshots).
  if (customer) {
    const addr = await Address.findOne({ user: customer._id, isDefault: true })
    const hist = await Product.find({ status: "active" })
      .sort({ soldCount: -1 })
      .skip(10)
      .limit(4)
    const day = 86_400_000
    const plan: { status: OrderStatus; daysAgo: number; pm: "cod" | "razorpay" }[] = [
      { status: "delivered", daysAgo: 20, pm: "cod" },
      { status: "delivered", daysAgo: 3, pm: "razorpay" },
      { status: "shipped", daysAgo: 2, pm: "cod" },
      { status: "cancelled", daysAgo: 8, pm: "cod" },
    ]
    if (addr && hist.length === 4) {
      const seededOrders = await Order.insertMany(
        plan.map((o, n) => {
          const p = hist[n]!
          const qty = 1 + (n % 2)
          const subtotal = p.price * qty
          const tax = Math.round(subtotal * 0.18)
          const shipping = subtotal > 499 ? 0 : 40
          const createdAt = new Date(now - o.daysAgo * day)
          const flow: OrderStatus[] =
            o.status === "cancelled"
              ? ["placed", "cancelled"]
              : o.status === "shipped"
                ? ["placed", "packed", "shipped"]
                : ["placed", "packed", "shipped", "out_for_delivery", "delivered"]
          return {
            orderNumber: `SS-SEED-${String(n + 1).padStart(6, "0")}`,
            user: customer._id,
            items: [
              {
                product: p._id,
                sku: p.sku,
                title: p.name,
                image: p.images[0]?.url,
                unitPrice: p.price,
                mrp: p.mrp,
                qty,
                lineTotal: subtotal,
              },
            ],
            addressSnapshot: {
              fullName: addr.fullName,
              phone: addr.phone,
              line1: addr.line1,
              landmark: addr.landmark,
              city: addr.city,
              state: addr.state,
              pincode: addr.pincode,
              type: addr.type,
            },
            delivery: {
              method: "standard",
              estimatedFrom: new Date(createdAt.getTime() + 2 * day),
              estimatedTo: new Date(createdAt.getTime() + 4 * day),
            },
            status: o.status,
            statusHistory: flow.map((status, i) => ({
              status,
              at: new Date(createdAt.getTime() + i * day),
            })),
            pricing: {
              subtotal,
              discount: 0,
              shipping,
              tax,
              total: subtotal + shipping + tax,
            },
            payment: {
              method: o.pm,
              status: o.status === "delivered" ? "paid" : "pending",
            },
            deliveredAt:
              o.status === "delivered"
                ? new Date(createdAt.getTime() + 4 * day)
                : undefined,
            cancelledAt:
              o.status === "cancelled" ? new Date(createdAt.getTime() + day) : undefined,
            cancelReason: o.status === "cancelled" ? "Ordered by mistake" : undefined,
            createdAt,
          }
        }),
        { timestamps: false }
      )
      // B6: the online-paid historical order gets its payment record (history page, refunds).
      await Payment.insertMany(
        seededOrders
          .filter((o) => o.payment?.method === "razorpay" && o.payment.status === "paid")
          .map((o) => ({
            order: o._id,
            user: o.user,
            orderNumber: o.orderNumber,
            provider: "mock" as const,
            providerOrderId: `order_seed_${o.orderNumber.slice(-6)}`,
            providerPaymentId: `pay_seed_${o.orderNumber.slice(-6)}`,
            amount: o.pricing.total,
            status: "paid" as const,
            method: "upi",
            attempts: 0,
            paidAt: o.createdAt,
            createdAt: o.createdAt,
          })),
        { timestamps: false }
      )
    }
  }

  // B7: reviewers, reviews for (almost) every product, a few photo reviews, helpful votes and Q&A.
  // The product's ratingAvg/ratingCount are REPLACED by the real numbers computed from these reviews,
  // so the PDP header, the histogram and the list always agree.
  {
    const reviewers = await User.insertMany(
      Array.from({ length: 14 }, (_, i) => ({
        name: `${faker.person.firstName()} ${faker.person.lastName()}`,
        email: `reviewer${i + 1}@shopsphere.dev`,
        emailVerified: true,
        passwordHash,
      }))
    )
    const pool = faker.helpers.shuffle(reviewers)
    const TEXT: Record<number, string[]> = {
      5: [
        "Absolutely love it. Exactly as described and the quality is excellent.",
        "Great value for money. Delivery was quick and packaging was solid.",
        "Better than I expected. Would happily buy again and recommend to friends.",
      ],
      4: [
        "Very good overall. Minor nitpicks but nothing that spoils it.",
        "Solid product, works as advertised. Slightly pricey but worth it.",
      ],
      3: [
        "It is okay. Does the job but nothing special for the price.",
        "Average. Some things are good, some could be better.",
      ],
      2: [
        "Not impressed. The finish feels cheap and it did not match the photos.",
        "Disappointing, expected more at this price point.",
      ],
      1: [
        "Stopped working within a week. Would not recommend to anyone.",
        "Poor quality and the support was unhelpful. Returning it.",
      ],
    }
    const TITLES: Record<number, string[]> = {
      5: ["Worth it", "Great!", "Happy with it"],
      4: ["Good buy", "Very good"],
      3: ["Decent", "Average"],
      2: ["Could be better", "Disappointed"],
      1: ["Not recommended", "Poor quality"],
    }
    const prods = await Product.find({ status: "active" }).select("_id soldCount").lean()
    const delivered = customer
      ? await Order.find({ user: customer._id, status: "delivered" })
          .sort({ createdAt: 1 })
          .lean()
      : []
    const docs: object[] = []
    for (const p of prods) {
      // popular products have more reviews; ~15% have none yet
      const count = faker.datatype.boolean({ probability: 0.15 })
        ? 0
        : faker.number.int({ min: 1, max: p.soldCount > 15000 ? 14 : 8 })
      const who = faker.helpers.arrayElements(pool, Math.min(count, pool.length))
      who.forEach((u, i) => {
        const rating = faker.helpers.weightedArrayElement([
          { weight: 5, value: 5 },
          { weight: 4, value: 4 },
          { weight: 2, value: 3 },
          { weight: 1, value: 2 },
          { weight: 1, value: 1 },
        ])
        const at = faker.date.recent({ days: 200 })
        docs.push({
          product: p._id,
          user: u._id,
          userName: maskName(u.name),
          rating,
          title: faker.helpers.arrayElement(TITLES[rating]!),
          body: `${faker.helpers.arrayElement(TEXT[rating]!)} ${faker.lorem.sentence()}`,
          photos:
            rating >= 4 && i === 0 && faker.datatype.boolean({ probability: 0.25 })
              ? [`https://picsum.photos/seed/review-${p._id}-${i}/600/600`]
              : [],
          verifiedPurchase: faker.datatype.boolean({ probability: 0.6 }),
          helpfulCount: faker.number.int({ min: 0, max: 40 }),
          createdAt: at,
          updatedAt: at,
        })
      })
    }
    if (customer && delivered[0]) {
      const it = delivered[0].items[0]!
      docs.push({
        product: it.product,
        user: customer._id,
        userName: maskName(customer.name),
        rating: 4,
        title: "Good, arrived on time",
        body: "Bought this last month. Does what it says, the build is decent and delivery was fast.",
        photos: [],
        verifiedPurchase: true,
        helpfulCount: 2,
      })
    }
    // The dev customer reviewed their FIRST delivered product; the second is left for the "write a review" demo.
    await Review.insertMany(docs)
    // helpful votes by the dev customer on a few reviews (shows the "voted" state)
    if (customer) {
      const some = await Review.find({
        user: { $ne: customer._id },
        helpfulCount: { $gte: 20 },
      })
        .limit(6)
        .lean()
      await Vote.insertMany(
        some.map((r) => ({ kind: "review", target: r._id, user: customer._id }))
      )
      await Review.updateMany(
        { _id: { $in: some.map((r) => r._id) } },
        { $inc: { helpfulCount: 1 } }
      )
    }
    const agg = await Review.aggregate<{ _id: unknown; avg: number; n: number }>([
      { $match: { status: "published" } },
      { $group: { _id: "$product", avg: { $avg: "$rating" }, n: { $sum: 1 } } },
    ])
    await Product.updateMany({}, { ratingAvg: 0, ratingCount: 0 })
    await Product.bulkWrite(
      agg.map((a) => ({
        updateOne: {
          filter: { _id: a._id },
          update: { ratingAvg: Math.round(a.avg * 10) / 10, ratingCount: a.n },
        },
      }))
    )

    // Q&A on the most popular products; the seller answers some.
    const popular = await Product.find({ status: "active" })
      .sort({ soldCount: -1 })
      .limit(40)
    const QUESTIONS = [
      "Does this come with a warranty and how do I claim it?",
      "Is it suitable for daily use or only occasional use?",
      "What is included in the box when it arrives?",
      "How does this compare with the previous model?",
    ]
    const ANSWERS = [
      "Yes, it comes with a one year manufacturer warranty; keep the invoice for claims.",
      "Works well for daily use. Mine has held up for months.",
      "You get the product, a quick start guide and the standard accessories.",
    ]
    for (const p of popular) {
      for (const text of faker.helpers.arrayElements(
        QUESTIONS,
        faker.number.int({ min: 1, max: 3 })
      )) {
        const asker = faker.helpers.arrayElement(reviewers)
        const q = await Question.create({
          product: p._id,
          user: asker._id,
          userName: maskName(asker.name),
          text,
          upvotes: faker.number.int({ min: 0, max: 12 }),
        })
        const n = faker.number.int({ min: 0, max: 3 })
        for (let k = 0; k < n; k++) {
          const bySeller =
            k === 0 && seller && faker.datatype.boolean({ probability: 0.6 })
          const who = bySeller ? seller! : faker.helpers.arrayElement(reviewers)
          await Answer.create({
            question: q._id,
            product: p._id,
            user: who._id,
            userName: maskName(who.name),
            text: faker.helpers.arrayElement(ANSWERS),
            badge: bySeller ? "seller" : undefined,
            verifiedBuyer: !bySeller && faker.datatype.boolean(),
            upvotes: faker.number.int({ min: 0, max: 8 }),
          })
        }
        if (n) await Question.updateOne({ _id: q._id }, { answerCount: n })
      }
    }
  }

  // B8: co-purchase history so "customers also bought" has real data: popular products are bought
  // together with a companion from their own category (and sometimes an accessory-like cheap item),
  // by the reviewer accounts. Historical snapshots again: stock/soldCount are not touched.
  // The dev customer also has a recently viewed list (their delivered products stay out of it).
  {
    const buyers = await User.find({ email: /^reviewer\d+@/ }).lean()
    const anchors = await Product.find({ status: "active" })
      .sort({ soldCount: -1 })
      .limit(40)
      .lean()
    const orders: object[] = []
    let n = 0
    for (const a of anchors) {
      const siblings = await Product.find({
        status: "active",
        category: a.category,
        _id: { $ne: a._id },
      })
        .sort({ soldCount: -1 })
        .limit(6)
        .lean()
      if (!siblings.length) continue
      for (let k = 0; k < 3; k++) {
        const basket = [a, ...faker.helpers.arrayElements(siblings, k === 0 ? 2 : 1)]
        const buyer = faker.helpers.arrayElement(buyers)
        const createdAt = new Date(
          now - faker.number.int({ min: 10, max: 120 }) * 86_400_000
        )
        const subtotal = basket.reduce((t, p) => t + p.price, 0)
        orders.push({
          orderNumber: `SS-SEED-B8-${String(++n).padStart(5, "0")}`,
          user: buyer._id,
          items: basket.map((p) => ({
            product: p._id,
            sku: p.sku,
            title: p.name,
            image: p.images[0]?.url,
            unitPrice: p.price,
            mrp: p.mrp,
            qty: 1,
            lineTotal: p.price,
          })),
          status: "delivered",
          statusHistory: [{ status: "delivered", at: createdAt }],
          pricing: { subtotal, discount: 0, shipping: 0, tax: 0, total: subtotal },
          payment: { method: "cod", status: "paid" },
          deliveredAt: createdAt,
          createdAt,
        })
      }
    }
    await Order.insertMany(orders, { timestamps: false })
    if (customer) {
      const mine = await Order.find({ user: customer._id }).select("items.product").lean()
      const bought = new Set(mine.flatMap((o) => o.items.map((i) => String(i.product))))
      const viewed = (
        await Product.find({ status: "active" }).sort({ soldCount: -1 }).limit(14).lean()
      )
        .filter((p) => !bought.has(String(p._id)))
        .slice(0, 6)
      await RecentlyViewed.insertMany(
        viewed.map((p, i) => ({
          user: customer._id,
          product: p._id,
          viewedAt: new Date(now - (i + 1) * 3_600_000),
        }))
      )
    }
  }

  // B9: the dev customer's notification history, built from their seeded orders with the SAME
  // templates the live system uses. Older ones are read; the newest few are unread (bell badge).
  if (customer) {
    const mine = await Order.find({ user: customer._id, orderNumber: /^SS-SEED-0/ })
      .sort({ createdAt: 1 })
      .lean()
    const rows: Record<string, unknown>[] = mine.flatMap((o) =>
      o.statusHistory.flatMap((h) => {
        const t = orderTemplate(
          { id: String(o._id), orderNumber: o.orderNumber },
          h.status,
          null
        )
        return t
          ? [
              {
                user: customer._id,
                category: t.category,
                type: t.type,
                title: t.title,
                body: t.body,
                link: t.link,
                data: { orderId: String(o._id), status: h.status },
                createdAt: h.at,
                readAt: new Date(h.at.getTime() + 3_600_000),
              },
            ]
          : []
      })
    )
    rows.sort((a, b) => +(a.createdAt as Date) - +(b.createdAt as Date))
    for (const r of rows.slice(-4)) delete r.readAt // newest 4 unread
    rows.push({
      user: customer._id,
      category: "offers",
      type: "offer.broadcast",
      title: "Weekend flash sale is live",
      body: "Up to 50% off on top brands. Ends Sunday.",
      link: "/deals",
      createdAt: new Date(now - 2 * 3_600_000),
    })
    await Notification.insertMany(rows, { timestamps: false })
  }

  logger.info(
    `Seeded ${total} products, ${await Category.countDocuments()} categories, 3 users`
  )
  logger.info(
    `Dev logins: admin@/seller@/customer@shopsphere.dev  password: ${DEV_PASSWORD}`
  )
  await disconnectDb()
}

main().catch(async (err) => {
  logger.error({ err }, "Seed failed")
  await disconnectDb().catch(() => {})
  process.exit(1)
})
