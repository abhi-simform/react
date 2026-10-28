import { describe, expect, it } from "vitest"

import {
  forgotPasswordSchema,
  loginSchema,
  passwordField,
  registerSchema,
  resetPasswordSchema,
} from "./schemas"

const valid = {
  name: "Asha Rao",
  email: "  Asha@Example.COM ",
  password: "Passw0rdX",
  confirmPassword: "Passw0rdX",
  acceptTerms: true as const,
}
const issuePaths = (r: {
  success: boolean
  error?: { issues: { path: PropertyKey[] }[] }
}) => r.error?.issues.map((i) => i.path.join(".")) ?? []

describe("passwordField", () => {
  it.each([
    ["short1A", false],
    ["alllowercase1", false],
    ["ALLUPPERCASE1", false],
    ["NoDigitsHere", false],
    ["Passw0rd", true],
    ["P".padEnd(72, "a") + "1", false],
    ["Valid1Pass", true],
  ])("%s -> %s", (pw, ok) =>
    expect(passwordField.safeParse(pw).success).toBe(ok)
  )
})

describe("registerSchema", () => {
  it("normalises email and accepts a valid form", () => {
    const r = registerSchema.safeParse(valid)
    expect(r.success && r.data.email).toBe("asha@example.com")
  })
  it.each<[string, object, string]>([
    ["short name", { name: "A" }, "name"],
    ["bad email", { email: "nope" }, "email"],
    [
      "mismatch attaches to confirmPassword",
      { confirmPassword: "Other1234" },
      "confirmPassword",
    ],
    ["terms not accepted", { acceptTerms: false }, "acceptTerms"],
  ])("%s", (_n, patch, path) => {
    expect(
      issuePaths(registerSchema.safeParse({ ...valid, ...patch }))
    ).toContain(path)
  })
})

describe("login / forgot / reset", () => {
  it("login does not enforce password strength", () => {
    expect(
      loginSchema.safeParse({ email: "a@b.co", password: "x" }).success
    ).toBe(true)
    expect(
      loginSchema.safeParse({ email: "a@b.co", password: "" }).success
    ).toBe(false)
  })
  it("forgot needs an email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "bad" }).success).toBe(false)
  })
  it("reset requires matching strong passwords", () => {
    expect(
      resetPasswordSchema.safeParse({
        password: "Passw0rdX",
        confirmPassword: "Passw0rdX",
      }).success
    ).toBe(true)
    expect(
      issuePaths(
        resetPasswordSchema.safeParse({
          password: "Passw0rdX",
          confirmPassword: "x",
        })
      )
    ).toEqual(["confirmPassword"])
  })
})
