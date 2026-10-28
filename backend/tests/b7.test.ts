import request from "supertest"
import { beforeEach, describe, expect, it } from "vitest"
import { createApp } from "../src/app.js"
import { Category } from "../src/modules/categories/category.model.js"
import { Order } from "../src/modules/orders/order.model.js"
import { Product } from "../src/modules/products/product.model.js"
import { Review, Vote } from "../src/modules/reviews/review.model.js"
import { User } from "../src/modules/users/user.model.js"

const app = createApp()
const A = "/api/v1"
const auth = (t: string) => ({ Authorization: `Bearer ${t}` })

type U = { token: string; id: string }
let seq = 0
async function user(name = "Casey Customer", role?: "admin" | "seller"): Promise<U> {
  const email = `r${seq++}@example.com`
  const res = await request(app)
    .post(`${A}/auth/register`)
    .send({ name, email, password: "Passw0rdOK" })
  const id = res.body.data.user.id as string
  if (role) {
    await User.updateOne({ email }, { role })
    const login = await request(app)
      .post(`${A}/auth/login`)
      .send({ email, password: "Passw0rdOK" })
    return { token: login.body.data.accessToken, id }
  }
  return { token: res.body.data.accessToken, id }
}

let pid = ""
let seller: U
beforeEach(async () => {
  seller = await user("Sam Seller", "seller")
  const cat = await Category.create({ name: "Mobiles", slug: "mobiles" })
  const p = await Product.create({
    name: "Phone",
    slug: "phone",
    sku: "PH1",
    brand: "Acme",
    category: cat._id,
    categoryPath: [cat._id],
    price: 1000,
    mrp: 2000,
    stock: 10,
    seller: seller.id,
  })
  pid = String(p._id)
})

const post = (
  u: U,
  rating: number,
  body = "Works great for the price, would buy again.",
  extra: object = {}
) =>
  request(app)
    .post(`${A}/products/${pid}/reviews`)
    .set(auth(u.token))
    .send({ rating, body, ...extra })

async function deliveredOrderFor(u: U) {
  await Order.create({
    orderNumber: `SS-T-${seq++}`,
    user: u.id,
    items: [
      {
        product: pid,
        sku: "PH1",
        title: "Phone",
        unitPrice: 1000,
        mrp: 2000,
        qty: 1,
        lineTotal: 1000,
      },
    ],
    status: "delivered",
    deliveredAt: new Date(),
    pricing: { subtotal: 1000, discount: 0, shipping: 0, tax: 180, total: 1180 },
    payment: { method: "cod", status: "paid" },
  })
}

describe("reviews", () => {
  it("creates a review, flags verified purchase, masks the name and updates the product aggregates", async () => {
    const u = await user()
    await deliveredOrderFor(u)
    const res = await post(u, 5)
    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({
      rating: 5,
      author: "Casey C.",
      verifiedPurchase: true,
      isMine: true,
    })
    const p = await Product.findById(pid)
    expect(p).toMatchObject({ ratingAvg: 5, ratingCount: 1 })
    const other = await user("Pat Buyer")
    expect((await post(other, 2)).body.data.verifiedPurchase).toBe(false)
    expect(await Product.findById(pid)).toMatchObject({ ratingAvg: 3.5, ratingCount: 2 })
  })

  it("one review per user per product (409), validates input (422), needs login (401), seller cannot review own product", async () => {
    const u = await user()
    expect((await post(u, 4)).status).toBe(201)
    const dup = await post(u, 3)
    expect(dup.status).toBe(409)
    expect(dup.body.error.code).toBe("ALREADY_REVIEWED")
    expect((await post(await user(), 6)).status).toBe(422)
    expect((await post(await user(), 3, "short")).status).toBe(422)
    expect(
      (
        await request(app)
          .post(`${A}/products/${pid}/reviews`)
          .send({ rating: 3, body: "long enough body" })
      ).status
    ).toBe(401)
    expect((await post(seller, 5)).body.error.code).toBe("OWN_PRODUCT")
    const parallel = await user()
    const [a, b] = await Promise.all([post(parallel, 4), post(parallel, 4)])
    expect([a.status, b.status].sort()).toEqual([201, 409])
    expect(await Review.countDocuments({ user: parallel.id })).toBe(1)
  })

  it("only accepts photos the user uploaded themselves", async () => {
    const u = await user()
    const other = await user()
    const uuid = "123e4567-e89b-12d3-a456-426614174000"
    const mine = `http://localhost:4000/uploads/${u.id}-${uuid}.jpg`
    const theirs = `http://localhost:4000/uploads/${other.id}-${uuid}.jpg`
    expect(
      (await post(u, 4, undefined, { photos: ["https://evil.example/x.jpg"] })).status
    ).toBe(422)
    const stolen = await post(u, 4, undefined, { photos: [theirs] })
    expect(stolen.status).toBe(422)
    expect(stolen.body.error.details[0].path).toBe("photos.0")
    const ok = await post(u, 4, undefined, { photos: [mine] })
    expect(ok.status).toBe(201)
    expect(ok.body.data.photos).toEqual([mine])
  })

  it("lists with sort, star filter, photo filter, paging and a histogram summary", async () => {
    const uuid = "123e4567-e89b-12d3-a456-426614174000"
    const users = await Promise.all([
      user("A One"),
      user("B Two"),
      user("C Three"),
      user("D Four"),
    ])
    await post(users[0]!, 5)
    await post(users[1]!, 4)
    await post(users[2]!, 1)
    await post(users[3]!, 5, undefined, {
      photos: [`http://x/uploads/${users[3]!.id}-${uuid}.png`],
    })
    const viewer = await user("Viewer V")
    const rid = (await Review.findOne({ user: users[2]!.id }))!._id
    await request(app).put(`${A}/reviews/${rid}/helpful`).set(auth(viewer.token))

    const lowest = await request(app).get(`${A}/products/${pid}/reviews?sort=lowest`)
    expect(lowest.body.data[0].rating).toBe(1)
    const helpful = await request(app)
      .get(`${A}/products/${pid}/reviews?sort=helpful`)
      .set(auth(viewer.token))
    expect(helpful.body.data[0]).toMatchObject({
      rating: 1,
      helpfulCount: 1,
      myVote: true,
    })
    const fives = await request(app).get(`${A}/products/${pid}/reviews?rating=5`)
    expect(fives.body.meta.total).toBe(2)
    const photos = await request(app).get(`${A}/products/${pid}/reviews?photos=true`)
    expect(photos.body.meta.total).toBe(1)
    const page2 = await request(app).get(`${A}/products/${pid}/reviews?limit=3&page=2`)
    expect(page2.body.data).toHaveLength(1)
    expect(page2.body.meta).toMatchObject({ total: 4, hasPrev: true, hasNext: false })
    const sum = await request(app).get(`${A}/products/${pid}/reviews/summary`)
    expect(sum.body.data).toEqual({
      average: 3.8,
      count: 4,
      histogram: { 1: 1, 2: 0, 3: 0, 4: 1, 5: 2 },
      withPhotos: 1,
    })
  })

  it("owner edits and deletes; others get 404; admin can delete; aggregates follow", async () => {
    const u = await user()
    const other = await user()
    const created = await post(u, 5)
    const id = created.body.data.id as string
    expect(
      (
        await request(app)
          .patch(`${A}/reviews/${id}`)
          .set(auth(other.token))
          .send({ rating: 1 })
      ).status
    ).toBe(404)
    const edited = await request(app)
      .patch(`${A}/reviews/${id}`)
      .set(auth(u.token))
      .send({ rating: 2 })
    expect(edited.body.data).toMatchObject({ rating: 2, edited: true })
    expect((await Product.findById(pid))!.ratingAvg).toBe(2)
    expect(
      (await request(app).patch(`${A}/reviews/${id}`).set(auth(u.token)).send({})).status
    ).toBe(422)
    expect(
      (await request(app).delete(`${A}/reviews/${id}`).set(auth(other.token))).status
    ).toBe(404)
    expect(
      (await request(app).delete(`${A}/reviews/${id}`).set(auth(u.token))).status
    ).toBe(204)
    expect(await Product.findById(pid)).toMatchObject({ ratingAvg: 0, ratingCount: 0 })
    // and it can be written again
    const again = await post(u, 3)
    const admin = await user("Admin", "admin")
    expect(
      (
        await request(app)
          .delete(`${A}/reviews/${again.body.data.id}`)
          .set(auth(admin.token))
      ).status
    ).toBe(204)
  })

  it("eligibility explains why a review is or is not allowed", async () => {
    const u = await user()
    const e1 = await request(app)
      .get(`${A}/products/${pid}/reviews/eligibility`)
      .set(auth(u.token))
    expect(e1.body.data).toMatchObject({
      canReview: true,
      reason: null,
      verifiedPurchase: false,
    })
    await post(u, 4)
    const e2 = await request(app)
      .get(`${A}/products/${pid}/reviews/eligibility`)
      .set(auth(u.token))
    expect(e2.body.data).toMatchObject({ canReview: false, reason: "ALREADY_REVIEWED" })
    expect(e2.body.data.review.rating).toBe(4)
    const e3 = await request(app)
      .get(`${A}/products/${pid}/reviews/eligibility`)
      .set(auth(seller.token))
    expect(e3.body.data.reason).toBe("OWN_PRODUCT")
  })

  it("helpful votes are idempotent, reversible, and never on your own review", async () => {
    const author = await user()
    const fan = await user()
    const id = (await post(author, 5)).body.data.id as string
    const vote = () => request(app).put(`${A}/reviews/${id}/helpful`).set(auth(fan.token))
    expect((await vote()).body.data).toEqual({ helpfulCount: 1, myVote: true })
    expect((await vote()).body.data.helpfulCount).toBe(1)
    const parallel = await Promise.all([vote(), vote(), vote()])
    expect(parallel.every((r) => r.status === 200)).toBe(true)
    expect((await Review.findById(id))!.helpfulCount).toBe(1)
    expect(await Vote.countDocuments()).toBe(1)
    const own = await request(app)
      .put(`${A}/reviews/${id}/helpful`)
      .set(auth(author.token))
    expect(own.status).toBe(403)
    expect((await request(app).put(`${A}/reviews/${id}/helpful`)).status).toBe(401)
    const undo = await request(app)
      .delete(`${A}/reviews/${id}/helpful`)
      .set(auth(fan.token))
    expect(undo.body.data).toEqual({ helpfulCount: 0, myVote: false })
    const again = await request(app)
      .delete(`${A}/reviews/${id}/helpful`)
      .set(auth(fan.token))
    expect(again.body.data.helpfulCount).toBe(0)
  })

  it("moderation: reports surface in the admin queue, hiding removes the review from the product and its rating", async () => {
    const author = await user()
    const reader = await user()
    const id = (
      await post(author, 1, "<script>alert(1)</script> terrible, do not buy this")
    ).body.data.id as string
    const listed = await request(app).get(`${A}/products/${pid}/reviews`)
    expect(listed.body.data[0].body).toContain("<script>") // stored and returned as plain text; the UI must not render HTML
    const r1 = await request(app)
      .post(`${A}/reviews/${id}/report`)
      .set(auth(reader.token))
      .send({ reason: "spam" })
    expect(r1.body.data.alreadyReported).toBe(false)
    const r2 = await request(app)
      .post(`${A}/reviews/${id}/report`)
      .set(auth(reader.token))
      .send({ reason: "spam" })
    expect(r2.body.data.alreadyReported).toBe(true)

    const admin = await user("Admin", "admin")
    expect(
      (await request(app).get(`${A}/admin/reviews`).set(auth(reader.token))).status
    ).toBe(403)
    const queue = await request(app)
      .get(`${A}/admin/reviews?reported=true`)
      .set(auth(admin.token))
    expect(queue.body.data[0]).toMatchObject({
      id,
      reportCount: 1,
      product: { name: "Phone" },
    })
    const mod = await request(app)
      .post(`${A}/admin/reviews/${id}/moderate`)
      .set(auth(admin.token))
      .send({ status: "hidden", note: "abusive" })
    expect(mod.body.data.status).toBe("hidden")
    expect(
      (await request(app).get(`${A}/products/${pid}/reviews`)).body.data
    ).toHaveLength(0)
    expect(await Product.findById(pid)).toMatchObject({ ratingCount: 0, ratingAvg: 0 })
    expect(
      (await request(app).put(`${A}/reviews/${id}/helpful`).set(auth(reader.token)))
        .status
    ).toBe(404)
  })
})

describe("product Q&A", () => {
  const ask = (u: U, text = "Does it support dual SIM and 5G networks?") =>
    request(app).post(`${A}/products/${pid}/questions`).set(auth(u.token)).send({ text })

  it("ask, answer (seller badge), list with answers, paginate answers", async () => {
    const asker = await user()
    const buyer = await user("Pat Buyer")
    await deliveredOrderFor(buyer)
    const q = await ask(asker)
    expect(q.status).toBe(201)
    const qid = q.body.data.id as string
    const sellerAns = await request(app)
      .post(`${A}/questions/${qid}/answers`)
      .set(auth(seller.token))
      .send({ text: "Yes, dual SIM and 5G." })
    expect(sellerAns.body.data).toMatchObject({ badge: "seller", verifiedBuyer: false })
    const buyerAns = await request(app)
      .post(`${A}/questions/${qid}/answers`)
      .set(auth(buyer.token))
      .send({ text: "Confirmed, using it daily." })
    expect(buyerAns.body.data).toMatchObject({ badge: null, verifiedBuyer: true })
    const list = await request(app).get(`${A}/products/${pid}/questions`)
    expect(list.body.data[0]).toMatchObject({ answerCount: 2, author: "Casey C." })
    expect(list.body.data[0].answers[0].badge).toBe("seller") // seller answers first
    const more = await request(app).get(`${A}/questions/${qid}/answers?limit=1&page=2`)
    expect(more.body.meta.total).toBe(2)
    expect(more.body.data).toHaveLength(1)
  })

  it("validates, requires login, upvotes once, never your own, delete rules", async () => {
    const asker = await user()
    const fan = await user()
    expect((await ask(asker, "short")).status).toBe(422)
    expect(
      (
        await request(app)
          .post(`${A}/products/${pid}/questions`)
          .send({ text: "Does it come with a charger?" })
      ).status
    ).toBe(401)
    const qid = (await ask(asker)).body.data.id as string
    const up = () => request(app).put(`${A}/questions/${qid}/upvote`).set(auth(fan.token))
    expect((await up()).body.data).toEqual({ upvotes: 1, myVote: true })
    expect((await up()).body.data.upvotes).toBe(1)
    expect(
      (await request(app).put(`${A}/questions/${qid}/upvote`).set(auth(asker.token)))
        .status
    ).toBe(403)
    const listed = await request(app)
      .get(`${A}/products/${pid}/questions`)
      .set(auth(fan.token))
    expect(listed.body.data[0]).toMatchObject({ upvotes: 1, myVote: true })
    expect(
      (await request(app).delete(`${A}/questions/${qid}`).set(auth(fan.token))).status
    ).toBe(404)
    expect(
      (await request(app).delete(`${A}/questions/${qid}`).set(auth(asker.token))).status
    ).toBe(204)
    expect(
      (await request(app).get(`${A}/products/${pid}/questions`)).body.data
    ).toHaveLength(0)
  })

  it("admin moderation hides a question and an answer", async () => {
    const asker = await user()
    const admin = await user("Admin", "admin")
    const qid = (await ask(asker)).body.data.id as string
    const aid = (
      await request(app)
        .post(`${A}/questions/${qid}/answers`)
        .set(auth(admin.token))
        .send({ text: "Ask the seller." })
    ).body.data
    expect(aid.badge).toBe("staff")
    expect(
      (
        await request(app)
          .post(`${A}/admin/answers/${aid.id}/moderate`)
          .set(auth(asker.token))
          .send({ status: "hidden" })
      ).status
    ).toBe(403)
    await request(app)
      .post(`${A}/admin/answers/${aid.id}/moderate`)
      .set(auth(admin.token))
      .send({ status: "hidden" })
    expect(
      (await request(app).get(`${A}/products/${pid}/questions`)).body.data[0].answers
    ).toHaveLength(0)
    await request(app)
      .post(`${A}/admin/questions/${qid}/moderate`)
      .set(auth(admin.token))
      .send({ status: "hidden" })
    expect(
      (await request(app).get(`${A}/products/${pid}/questions`)).body.data
    ).toHaveLength(0)
    expect(
      (
        await request(app)
          .get(`${A}/admin/questions?status=hidden`)
          .set(auth(admin.token))
      ).body.meta.total
    ).toBe(1)
  })
})
