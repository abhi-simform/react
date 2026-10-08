import { faker } from "@faker-js/faker"
import bcrypt from "bcryptjs"
import mongoose from "mongoose"
import { connectDb, disconnectDb } from "../config/db.js"
import { logger } from "../config/logger.js"
import { Category } from "../modules/categories/category.model.js"
import { Product } from "../modules/products/product.model.js"
import { User } from "../modules/users/user.model.js"
import { RefreshToken } from "../modules/auth/refreshToken.model.js"
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
