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
import { Order } from "../modules/orders/order.model.js"
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
