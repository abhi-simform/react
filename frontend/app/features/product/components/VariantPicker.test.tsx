import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it } from "vitest"

import { productDetail } from "@/test/msw/db"
import { variantsFixture } from "@/test/fixtures/variants"

import { findVariant, type Selection } from "../variants"
import { VariantPicker } from "./VariantPicker"

const variants = variantsFixture(productDetail as never)

function Harness() {
  const [selection, setSelection] = useState<Selection>({})
  const variant = findVariant(variants, selection)
  return (
    <>
      <VariantPicker
        variants={variants}
        selection={selection}
        onSelectionChange={setSelection}
      />
      <p>{variant ? `Price ${variant.price}` : "Choose all options"}</p>
    </>
  )
}

describe("VariantPicker", () => {
  it("groups options by attribute in labelled fieldsets", () => {
    render(<Harness />)
    expect(screen.getByRole("group", { name: /color/i })).toBeInTheDocument()
    expect(screen.getByRole("group", { name: /storage/i })).toBeInTheDocument()
    expect(screen.getAllByRole("radio")).toHaveLength(6)
  })

  it("choosing Silver clears 64 GB: that pair does not exist", async () => {
    const user = userEvent.setup()
    render(<Harness />)
    // Silver exists, 64 GB exists: only the PAIR is missing, so it is fixed by selectOption, not disabled.
    await user.click(screen.getByRole("radio", { name: "64 GB" }))
    await user.click(screen.getByRole("radio", { name: "Silver" }))
    expect(screen.getByRole("radio", { name: "Silver" })).toBeChecked()
    // the conflicting storage was cleared, so the price is not derived from an invalid pair
    expect(screen.getByRole("radio", { name: "64 GB" })).not.toBeChecked()
    expect(screen.getByText("Choose all options")).toBeInTheDocument()
  })

  it("derives the price once every attribute is chosen", async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole("radio", { name: "Black" }))
    expect(screen.getByText("Choose all options")).toBeInTheDocument()
    await user.click(screen.getByRole("radio", { name: "128 GB" }))
    const expected = variants.find(
      (v) => v.attributes.color === "Black" && v.attributes.storage === "128 GB"
    )!
    expect(screen.getByText(`Price ${expected.price}`)).toBeInTheDocument()
  })

  it("is operable with the keyboard (arrow keys move between radios)", async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.tab()
    expect(screen.getByRole("radio", { name: "Black" })).toHaveFocus()
    await user.keyboard("{ArrowRight}")
    expect(screen.getByRole("radio", { name: "Blue" })).toBeChecked()
  })
})
