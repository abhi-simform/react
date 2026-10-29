import request from "supertest"
import { beforeEach, describe, expect, it } from "vitest"
import { createApp } from "../src/app.js"
import { Brand } from "../src/modules/categories/brand.model.js"
import { Category } from "../src/modules/categories/category.model.js"
import { Product } from "../src/modules/products/product.model.js"
import { RefreshToken } from "../src/modules/auth/refreshToken.model.js"
import { User } from "../src/modules/users/user.model.js"

const app = createApp()
const A = "/api/v1"
const auth = (t: string) => ({ Authorization: `Bearer ${t}` })

async function account(email: string, role: "customer" | "seller" | "admin") {
  const reg = await request(app)
    .post(`${A}/auth/register`)
    .send({ name: "Test User", email, password: "Passw0rdOK" })
  const id = reg.body.data.user.id as string
  if (role !== "customer") {
    await User.updateOne({ _id: id }, { role })
    const res = await request(app)
      .post(`${A}/auth/login`)
      .send({ email, password: "Passw0rdOK" })
    return { token: res.body.data.accessToken as string, id }
  }
  return { token: reg.body.data.accessToken as string, id }
}

let phones: string
let admin: { token: string; id: string }
let sellerA: { token: string; id: string }
let sellerB: { token: string; id: string }
let customer: { token: string; id: string }

beforeEach(async () => {
  phones = String((await Category.create({ name: "Phones", slug: "phones" }))._id)
  admin = await account("admin@example.com", "admin")
  sellerA = await account("sa@example.com", "seller")
  sellerB = await account("sb@example.com", "seller")
  customer = await account("c@example.com", "customer")
})

const body = (over: Record<string, unknown> = {}) => ({
  name: "Nova Phone",
  brand: "Nova",
  categoryId: phones,
  price: 900,
  mrp: 1000,
  sku: "NOVA-1",
  stock: 5,
  status: "active",
  ...over,
})
const create = (
  token: string,
  over?: Record<string, unknown>,
  base = "/seller/products"
) => request(app).post(`${A}${base}`).set(auth(token)).send(body(over))

describe("product create/update (seller + admin)", () => {
  it("creates a product owned by the seller, with slug, categoryPath, brand row", async () => {
    const res = await create(sellerA.token, {
      images: [{ url: "https://img.test/a.jpg", alt: "front" }],
      specs: [{ key: "RAM", value: "8 GB" }],
    })
    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({
      slug: "nova-phone",
      discountPercent: 10,
      status: "active",
      seller: { _id: sellerA.id },
      category: { slug: "phones" },
    })
    expect(await Brand.countDocuments({ name: "Nova" })).toBe(1)
    // active products show on the public storefront
    const pub = await request(app).get(`${A}/products/nova-phone`)
    expect(pub.status).toBe(200)
  })

  it("derives stock from variants and rejects stock edits when variants exist", async () => {
    const res = await create(sellerA.token, {
      variants: [
        { sku: "NOVA-1-S", size: "S", price: 900, stock: 3 },
        { sku: "NOVA-1-L", size: "L", price: 950, stock: 4 },
      ],
    })
    expect(res.status).toBe(201)
    expect(res.body.data.stock).toBe(7)
    const bad = await request(app)
      .patch(`${A}/seller/products/${res.body.data._id}`)
      .set(auth(sellerA.token))
      .send({ stock: 99 })
    expect(bad.status).toBe(422)
    expect(bad.body.error.details[0].path).toBe("stock")
  })

  it("422 with nested paths: duplicate variant sku, price above mrp, float price", async () => {
    const dup = await create(sellerA.token, {
      variants: [
        { sku: "X", price: 1, stock: 1 },
        { sku: "x", price: 1, stock: 1 },
      ],
    })
    expect(dup.status).toBe(422)
    expect(dup.body.error.details[0].path).toBe("variants.1.sku")
    const high = await create(sellerA.token, { price: 2000 })
    expect(high.body.error.details[0].path).toBe("price")
    const float = await create(sellerA.token, { price: 99.5 })
    expect(float.status).toBe(422)
    const noCat = await create(sellerA.token, { categoryId: "a".repeat(24) })
    expect(noCat.body.error.details[0].path).toBe("categoryId")
  })

  it("409 SKU_TAKEN carries the field path", async () => {
    await create(sellerA.token)
    const res = await create(sellerB.token, { name: "Other" })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe("SKU_TAKEN")
    expect(res.body.error.details[0].path).toBe("sku")
  })

  it("PATCH is partial (does not wipe images) and archive hides it from the storefront", async () => {
    const made = await create(sellerA.token, {
      images: [{ url: "https://img.test/a.jpg" }],
    })
    const id = made.body.data._id
    const patch = await request(app)
      .patch(`${A}/seller/products/${id}`)
      .set(auth(sellerA.token))
      .send({ price: 800 })
    expect(patch.status).toBe(200)
    expect(patch.body.data.price).toBe(800)
    expect(patch.body.data.images).toHaveLength(1)
    const del = await request(app)
      .delete(`${A}/seller/products/${id}`)
      .set(auth(sellerA.token))
    expect(del.body.data.status).toBe("archived")
    expect((await request(app).get(`${A}/products/nova-phone`)).status).toBe(404)
  })

  it("a seller cannot self-promote featured; an admin can", async () => {
    const s = await create(sellerA.token, { isFeatured: true })
    expect(s.body.data.isFeatured).toBe(false)
    const a = await create(
      admin.token,
      { sku: "N2", name: "Adm", isFeatured: true },
      "/admin/products"
    )
    expect(a.body.data.isFeatured).toBe(true)
  })
})

describe("role enforcement and seller isolation", () => {
  it("401 anonymous, 403 customer on every catalog write area", async () => {
    for (const path of [
      "/seller/products",
      "/admin/products",
      "/admin/categories",
      "/admin/brands",
      "/admin/users",
    ]) {
      expect((await request(app).get(`${A}${path}`)).status).toBe(401)
      expect(
        (await request(app).get(`${A}${path}`).set(auth(customer.token))).status
      ).toBe(403)
    }
    // sellers are not admins
    for (const path of [
      "/admin/products",
      "/admin/categories",
      "/admin/brands",
      "/admin/users",
    ])
      expect(
        (await request(app).get(`${A}${path}`).set(auth(sellerA.token))).status
      ).toBe(403)
  })

  it("a seller lists, reads, edits and archives only their own products (others are 404)", async () => {
    const mine = (await create(sellerA.token)).body.data._id
    const theirs = (await create(sellerB.token, { sku: "B-1", name: "Bee" })).body.data
      ._id

    const list = await request(app).get(`${A}/seller/products`).set(auth(sellerA.token))
    expect(list.body.meta.total).toBe(1)
    expect(list.body.data[0]._id).toBe(mine)
    // even asking for the other seller explicitly does not widen it
    const probe = await request(app)
      .get(`${A}/seller/products?seller=${sellerB.id}`)
      .set(auth(sellerA.token))
    expect(probe.body.meta.total).toBe(1)

    for (const call of [
      request(app).get(`${A}/seller/products/${theirs}`),
      request(app).patch(`${A}/seller/products/${theirs}`).send({ price: 1 }),
      request(app).delete(`${A}/seller/products/${theirs}`),
    ])
      expect((await call.set(auth(sellerA.token))).status).toBe(404)
    expect((await Product.findById(theirs))!.status).toBe("active")

    // bulk: foreign ids silently do not match
    const bulk = await request(app)
      .post(`${A}/seller/products/bulk`)
      .set(auth(sellerA.token))
      .send({ ids: [mine, theirs], status: "archived" })
    expect(bulk.body.data).toMatchObject({ requested: 2, matched: 1, modified: 1 })
    expect((await Product.findById(theirs))!.status).toBe("active")
  })

  it("an admin sees all products and can filter by seller/status/search; CSV export honours filters", async () => {
    await create(sellerA.token)
    await create(sellerB.token, { sku: "B-1", name: "Bee Phone", status: "draft" })
    const all = await request(app).get(`${A}/admin/products`).set(auth(admin.token))
    expect(all.body.meta.total).toBe(2)
    const draft = await request(app)
      .get(`${A}/admin/products?status=draft&search=bee&sort=price&order=asc`)
      .set(auth(admin.token))
    expect(draft.body.data.map((p: { sku: string }) => p.sku)).toEqual(["B-1"])
    const csv = await request(app)
      .get(`${A}/admin/products/export.csv?seller=${sellerA.id}`)
      .set(auth(admin.token))
    expect(csv.headers["content-type"]).toContain("text/csv")
    expect(csv.text.trim().split("\n")).toHaveLength(2)
    expect(csv.text).toContain("NOVA-1")
  })

  it("CSV cells that look like formulas are neutralised", async () => {
    await create(sellerA.token, { name: "=HYPERLINK(1)" })
    const csv = await request(app)
      .get(`${A}/seller/products/export.csv`)
      .set(auth(sellerA.token))
    expect(csv.text).toContain("'=HYPERLINK(1)")
  })
})

describe("categories and brands (admin)", () => {
  it("creates, moves (rebuilding ancestors + product paths), reorders and deletes", async () => {
    const mk = async (name: string, parentId?: string) =>
      (
        await request(app)
          .post(`${A}/admin/categories`)
          .set(auth(admin.token))
          .send({ name, ...(parentId ? { parentId } : {}) })
      ).body.data
    const tech = await mk("Tech")
    const home = await mk("Home")
    const audio = await mk("Audio", tech._id)
    expect(audio).toMatchObject({ slug: "audio", sortOrder: 0 })
    const audio2 = await mk("Audio")
    expect(audio2.slug).toBe("audio-2") // slug collision resolved
    const p = await create(admin.token, { categoryId: audio._id }, "/admin/products")
    expect(p.body.data.category.slug).toBe("audio")

    const move = await request(app)
      .patch(`${A}/admin/categories/${audio._id}`)
      .set(auth(admin.token))
      .send({ parentId: home._id })
    expect(move.status).toBe(200)
    const moved = await Product.findById(p.body.data._id)
    expect(moved!.categoryPath.map(String)).toEqual([home._id, audio._id])

    const cycle = await request(app)
      .patch(`${A}/admin/categories/${home._id}`)
      .set(auth(admin.token))
      .send({ parentId: audio._id })
    expect(cycle.status).toBe(422)
    expect(cycle.body.error.details[0].path).toBe("parentId")

    const reorder = await request(app)
      .put(`${A}/admin/categories/reorder`)
      .set(auth(admin.token))
      .send({ parentId: null, ids: [home._id, tech._id, phones, audio2._id] })
    expect(reorder.status).toBe(200)
    const roots = reorder.body.data.filter((c: { parent: string | null }) => !c.parent)
    expect(roots.map((c: { name: string }) => c.name).slice(0, 2)).toEqual([
      "Home",
      "Tech",
    ])
    const partial = await request(app)
      .put(`${A}/admin/categories/reorder`)
      .set(auth(admin.token))
      .send({ parentId: null, ids: [home._id] })
    expect(partial.status).toBe(422)

    // not empty -> 409; empty -> 204
    const blocked = await request(app)
      .delete(`${A}/admin/categories/${audio._id}`)
      .set(auth(admin.token))
    expect(blocked.status).toBe(409)
    expect(blocked.body.error.code).toBe("CATEGORY_NOT_EMPTY")
    const empty = await request(app)
      .delete(`${A}/admin/categories/${tech._id}`)
      .set(auth(admin.token))
    expect(empty.status).toBe(204)
  })

  it("brand CRUD: case-insensitive uniqueness, rename cascades to products, delete guarded", async () => {
    await create(sellerA.token) // brand "Nova" auto-created
    const list = await request(app).get(`${A}/admin/brands`).set(auth(admin.token))
    expect(list.body.data).toHaveLength(1)
    expect(list.body.data[0]).toMatchObject({ name: "Nova", productCount: 1 })
    const dup = await request(app)
      .post(`${A}/admin/brands`)
      .set(auth(admin.token))
      .send({ name: "nova" })
    expect(dup.status).toBe(409)
    expect(dup.body.error.code).toBe("BRAND_EXISTS")

    const rename = await request(app)
      .patch(`${A}/admin/brands/${list.body.data[0]._id}`)
      .set(auth(admin.token))
      .send({ name: "Nova Mobile" })
    expect(rename.body.data.name).toBe("Nova Mobile")
    expect((await Product.findOne({ sku: "NOVA-1" }))!.brand).toBe("Nova Mobile")

    const inUse = await request(app)
      .delete(`${A}/admin/brands/${list.body.data[0]._id}`)
      .set(auth(admin.token))
    expect(inUse.body.error.code).toBe("BRAND_IN_USE")
    const fresh = await request(app)
      .post(`${A}/admin/brands`)
      .set(auth(admin.token))
      .send({ name: "Zed" })
    expect(fresh.status).toBe(201)
    expect(
      (
        await request(app)
          .delete(`${A}/admin/brands/${fresh.body.data._id}`)
          .set(auth(admin.token))
      ).status
    ).toBe(204)
  })

  it("validation failure returns 422 with a path", async () => {
    const res = await request(app)
      .post(`${A}/admin/categories`)
      .set(auth(admin.token))
      .send({ name: "" })
    expect(res.status).toBe(422)
    expect(res.body.error.details[0].path).toBe("name")
  })
})

describe("admin users", () => {
  it("lists with search/role filter and pagination meta", async () => {
    const res = await request(app)
      .get(`${A}/admin/users?role=seller&sort=email&order=asc`)
      .set(auth(admin.token))
    expect(res.status).toBe(200)
    expect(res.body.data.map((u: { email: string }) => u.email)).toEqual([
      "sa@example.com",
      "sb@example.com",
    ])
    expect(res.body.meta.total).toBe(2)
    expect(res.body.data[0]).not.toHaveProperty("passwordHash")
    const s = await request(app)
      .get(`${A}/admin/users?search=c@exa`)
      .set(auth(admin.token))
    expect(s.body.data).toHaveLength(1)
  })

  it("changes a role and signs the user out; cannot change your own", async () => {
    const res = await request(app)
      .patch(`${A}/admin/users/${customer.id}/role`)
      .set(auth(admin.token))
      .send({ role: "seller" })
    expect(res.body.data.role).toBe("seller")
    expect(
      await RefreshToken.countDocuments({ user: customer.id, revokedAt: null })
    ).toBe(0)
    const self = await request(app)
      .patch(`${A}/admin/users/${admin.id}/role`)
      .set(auth(admin.token))
      .send({ role: "customer" })
    expect(self.status).toBe(409)
    expect(self.body.error.code).toBe("SELF_MODIFICATION")
    const bad = await request(app)
      .patch(`${A}/admin/users/${customer.id}/role`)
      .set(auth(admin.token))
      .send({ role: "root" })
    expect(bad.status).toBe(422)
  })

  it("deactivation blocks login and refresh", async () => {
    const res = await request(app)
      .patch(`${A}/admin/users/${customer.id}/status`)
      .set(auth(admin.token))
      .send({ isActive: false })
    expect(res.body.data.isActive).toBe(false)
    const login = await request(app)
      .post(`${A}/auth/login`)
      .send({ email: "c@example.com", password: "Passw0rdOK" })
    expect(login.status).toBe(403)
    const back = await request(app)
      .patch(`${A}/admin/users/${customer.id}/status`)
      .set(auth(admin.token))
      .send({ isActive: true })
    expect(back.body.data.isActive).toBe(true)
  })

  it("role changes land in the audit log", async () => {
    await request(app)
      .patch(`${A}/admin/users/${customer.id}/role`)
      .set(auth(admin.token))
      .send({ role: "seller" })
    await new Promise((r) => setTimeout(r, 100)) // the audit row is written on response finish
    const log = await request(app)
      .get(`${A}/admin/audit-logs?action=PATCH /admin/users`)
      .set(auth(admin.token))
    expect(log.body.data[0]).toMatchObject({
      action: "PATCH /admin/users/:id/role",
      targets: [customer.id],
    })
  })
})
