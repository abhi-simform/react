import { describe, expect, it } from "vitest"

import { productionConfigProblems, type ProdConfig } from "../src/config/prodChecks.js"
import {
  DEV_PASSWORD,
  WIPE_FLAG,
  isLocalMongoUri,
  resolveSeedSafety,
} from "../src/seed/guard.js"

const good: ProdConfig = {
  NODE_ENV: "production",
  COOKIE_SECURE: true,
  COOKIE_SAMESITE: "lax",
  JWT_ACCESS_SECRET: "a3f9c1e07b5d4a6c8e2f1b9d0c7a5e3f4b6d8a0c2e4f6a8b",
  CORS_ORIGINS: ["https://shop.example.com"],
  CLIENT_URL: "https://shop.example.com",
}

describe("production configuration guard (14.2)", () => {
  it("accepts a sane production config and ignores other environments", () => {
    expect(productionConfigProblems(good)).toEqual([])
    expect(
      productionConfigProblems({
        ...good,
        NODE_ENV: "development",
        COOKIE_SECURE: false,
        JWT_ACCESS_SECRET: "dev-only-secret-change-me",
      })
    ).toEqual([])
  })

  it("names every unsafe setting", () => {
    const problems = productionConfigProblems({
      ...good,
      COOKIE_SECURE: false,
      JWT_ACCESS_SECRET: "dev-only-access-secret-change-me-please-0123456789",
      CORS_ORIGINS: ["*", "http://shop.example.com"],
      CLIENT_URL: "http://shop.example.com",
    })
    expect(problems.join("\n")).toMatch(/COOKIE_SECURE/)
    expect(problems.join("\n")).toMatch(/JWT_ACCESS_SECRET/)
    expect(problems.join("\n")).toMatch(/wildcard/)
    expect(problems.join("\n")).toMatch(/https:\/\/ origins/)
    expect(problems.join("\n")).toMatch(/CLIENT_URL/)
  })

  it("allows a localhost origin (a staging API used from a local frontend)", () => {
    expect(
      productionConfigProblems({
        ...good,
        CORS_ORIGINS: ["https://shop.example.com", "http://localhost:5173"],
      })
    ).toEqual([])
  })
})

describe("seed safety (14.5)", () => {
  const atlas =
    "mongodb+srv://user:pw@cluster0.abcde.mongodb.net/shopsphere?retryWrites=true"

  it("recognises local databases", () => {
    expect(isLocalMongoUri("mongodb://localhost:27017/shopsphere?replicaSet=rs0")).toBe(
      true
    )
    expect(isLocalMongoUri("mongodb://mongo:27017/shopsphere")).toBe(true)
    expect(isLocalMongoUri(atlas)).toBe(false)
    expect(isLocalMongoUri("mongodb://localhost:27017,evil.example.com:27017/x")).toBe(
      false
    )
    expect(isLocalMongoUri("")).toBe(false)
  })

  it("local: dev password by default, SEED_PASSWORD when given, reset allowed", () => {
    const local = "mongodb://localhost:27017/shopsphere"
    expect(resolveSeedSafety({ uri: local, argv: ["--reset"] }).password).toBe(
      DEV_PASSWORD
    )
    expect(
      resolveSeedSafety({ uri: local, argv: [], seedPassword: "something-else" }).password
    ).toBe("something-else")
  })

  it("remote: refuses --reset without the explicit flag, and never prints credentials", () => {
    expect(() =>
      resolveSeedSafety({
        uri: atlas,
        argv: ["--reset"],
        seedPassword: "a-long-demo-password",
      })
    ).toThrow(/Refusing to DROP/)
    expect(() => resolveSeedSafety({ uri: atlas, argv: ["--reset"] })).toThrow(/\*\*\*@/)
    expect(
      resolveSeedSafety({
        uri: atlas,
        argv: ["--reset", WIPE_FLAG],
        seedPassword: "a-long-demo-password",
      }).password
    ).toBe("a-long-demo-password")
  })

  it("remote: the public development password is refused", () => {
    expect(() => resolveSeedSafety({ uri: atlas, argv: [] })).toThrow(/SEED_PASSWORD/)
    expect(() =>
      resolveSeedSafety({ uri: atlas, argv: [], seedPassword: DEV_PASSWORD })
    ).toThrow(/SEED_PASSWORD/)
    expect(() =>
      resolveSeedSafety({ uri: atlas, argv: [], seedPassword: "short" })
    ).toThrow(/12/)
  })
})
