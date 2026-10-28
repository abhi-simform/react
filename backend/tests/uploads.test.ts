import { rm, readFile } from "node:fs/promises"
import path from "node:path"
import request from "supertest"
import { afterAll, describe, expect, it } from "vitest"
import { createApp } from "../src/app.js"
import { sniffImage } from "../src/modules/uploads/sniff.js"
import {
  getStorage,
  LocalDiskStorage,
  setStorage,
  uploadRoot,
} from "../src/modules/uploads/storage.js"

const app = createApp()
const U = "/api/v1/uploads/images"

// Smallest valid-looking headers: the endpoint checks magic bytes, not decodability.
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32),
])
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)])
const WEBP = Buffer.concat([
  Buffer.from("RIFF"),
  Buffer.alloc(4),
  Buffer.from("WEBP"),
  Buffer.alloc(16),
])

async function token() {
  const res = await request(app)
    .post("/api/v1/auth/register")
    .send({ name: "Upload User", email: "up@example.com", password: "Passw0rdOK" })
  return res.body.data.accessToken as string
}

afterAll(() => rm(uploadRoot(), { recursive: true, force: true }))

describe("sniffImage", () => {
  it("recognises jpeg, png, webp and rejects everything else", () => {
    expect(sniffImage(JPEG)?.ext).toBe("jpg")
    expect(sniffImage(PNG)?.ext).toBe("png")
    expect(sniffImage(WEBP)?.ext).toBe("webp")
    expect(sniffImage(Buffer.from("GIF89a....."))).toBeNull()
    expect(sniffImage(Buffer.from("<svg></svg>"))).toBeNull()
    expect(sniffImage(Buffer.alloc(0))).toBeNull()
  })
})

describe("POST /uploads/images", () => {
  it("401 without a token", async () => {
    const res = await request(app).post(U).attach("file", PNG, "a.png")
    expect(res.status).toBe(401)
  })

  it("stores a PNG and serves it back from the returned URL", async () => {
    const t = await token()
    const res = await request(app)
      .post(U)
      .set("Authorization", `Bearer ${t}`)
      .attach("file", PNG, { filename: "../../evil name.png", contentType: "image/png" })
    expect(res.status).toBe(201)
    const { key, url, contentType, bytes } = res.body.data
    expect(contentType).toBe("image/png")
    expect(bytes).toBe(PNG.length)
    expect(key).toMatch(/^[0-9a-f]{24}-[0-9a-f-]{36}\.png$/) // client name never used
    expect(url).toMatch(/\/uploads\/.+\.png$/)
    const onDisk = await readFile(path.join(uploadRoot(), key))
    expect(onDisk.equals(PNG)).toBe(true)
    const served = await request(app).get(new URL(url).pathname)
    expect(served.status).toBe(200)
    expect(served.headers["content-type"]).toBe("image/png")
    expect(served.headers["x-content-type-options"]).toBe("nosniff")
  })

  it("415 when the bytes are not an allowed image, whatever the Content-Type claims", async () => {
    const t = await token()
    const res = await request(app)
      .post(U)
      .set("Authorization", `Bearer ${t}`)
      .attach("file", Buffer.from("<script>alert(1)</script>"), {
        filename: "x.png",
        contentType: "image/png",
      })
    expect(res.status).toBe(415)
    expect(res.body.error.code).toBe("UNSUPPORTED_FILE_TYPE")
  })

  it("413 when the file is over the size limit", async () => {
    const t = await token()
    const big = Buffer.concat([JPEG, Buffer.alloc(200 * 1024)])
    const res = await request(app)
      .post(U)
      .set("Authorization", `Bearer ${t}`)
      .attach("file", big, { filename: "big.jpg", contentType: "image/jpeg" })
    expect(res.status).toBe(413)
    expect(res.body.error.code).toBe("FILE_TOO_LARGE")
  })

  it("422 when no file is attached, or two are", async () => {
    const t = await token()
    const none = await request(app)
      .post(U)
      .set("Authorization", `Bearer ${t}`)
      .field("note", "hi")
    expect(none.status).toBe(422)
    expect(none.body.error.details[0].path).toBe("file")
    const two = await request(app)
      .post(U)
      .set("Authorization", `Bearer ${t}`)
      .attach("file", PNG, "a.png")
      .attach("file", PNG, "b.png")
    expect(two.status).toBe(422)
  })

  it("goes through the ImageStorage interface (swappable for Cloudinary)", async () => {
    const original = getStorage()
    setStorage({
      save: async ({ type, buffer }) => ({
        key: "fake",
        url: "https://res.cloudinary.example/fake",
        contentType: type.mime,
        bytes: buffer.length,
      }),
    })
    try {
      const t = await token()
      const res = await request(app)
        .post(U)
        .set("Authorization", `Bearer ${t}`)
        .attach("file", WEBP, "a.webp")
      expect(res.status).toBe(201)
      expect(res.body.data.url).toBe("https://res.cloudinary.example/fake")
    } finally {
      setStorage(original)
    }
    expect(original).toBeInstanceOf(LocalDiskStorage)
  })
})
