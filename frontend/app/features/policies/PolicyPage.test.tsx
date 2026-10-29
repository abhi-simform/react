import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { NotFoundError } from "@/lib/notFound"

import { POLICIES } from "./content"
import { PolicyPage } from "./PolicyPage"

describe("legal pages (14.9)", () => {
  it("privacy, returns and terms exist with real content, not placeholders", () => {
    for (const slug of ["privacy", "returns", "terms"]) {
      const policy = POLICIES[slug]
      expect(policy, slug).toBeDefined()
      expect(policy?.sections.length).toBeGreaterThanOrEqual(
        3 - (slug === "terms" ? 0 : 1)
      )
      expect(JSON.stringify(policy)).not.toMatch(/lorem|placeholder|todo/i)
    }
  })

  it("renders the title, the date and every section heading", () => {
    render(<PolicyPage slug="privacy" />)
    expect(
      screen.getByRole("heading", { level: 1, name: "Privacy policy" })
    ).toBeInTheDocument()
    expect(screen.getByText(/last updated/i)).toBeInTheDocument()
    for (const s of POLICIES.privacy!.sections)
      expect(
        screen.getByRole("heading", { level: 2, name: s.heading })
      ).toBeInTheDocument()
  })

  it("an unknown slug (or a prototype key) is a 404, not a crash", () => {
    expect(() => render(<PolicyPage slug="shipping" />)).toThrow(NotFoundError)
    expect(() => render(<PolicyPage slug="constructor" />)).toThrow(
      NotFoundError
    )
  })
})
