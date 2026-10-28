import { screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api/errors"
import addresses from "@/test/fixtures/api/addresses.json"
import { renderWithProviders } from "@/test/render"

import type { Address } from "../schemas"
import { AddressFormDialog } from "./AddressFormDialog"

const existing = addresses.data[0] as Address

describe("AddressFormDialog", () => {
  it("edit mode prefills every field from the address", async () => {
    await renderWithProviders(
      <AddressFormDialog
        target={existing}
        pending={false}
        onClose={() => {}}
        onSubmit={async () => null}
      />
    )
    expect(
      await screen.findByRole("dialog", { name: "Edit address" })
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Full name")).toHaveValue(existing.fullName)
    expect(screen.getByLabelText("Mobile number")).toHaveValue(existing.phone)
    expect(screen.getByLabelText("House, street")).toHaveValue(existing.line1)
    expect(screen.getByLabelText("City")).toHaveValue(existing.city)
    expect(screen.getByLabelText("Pincode")).toHaveValue(existing.pincode)
    expect(screen.getByRole("combobox", { name: "State" })).toHaveTextContent(
      existing.state
    )
    expect(screen.getByRole("radio", { name: "home" })).toBeChecked()
    expect(
      screen.getByRole("button", { name: "Save changes" })
    ).toBeInTheDocument()
    // the default flag has its own endpoint: not offered when editing
    expect(screen.queryByRole("switch")).not.toBeInTheDocument()
  })

  it("new mode starts empty and validation names each problem", async () => {
    const onSubmit = vi.fn()
    const { user } = await renderWithProviders(
      <AddressFormDialog
        target="new"
        pending={false}
        onClose={() => {}}
        onSubmit={onSubmit}
      />
    )
    expect(await screen.findByLabelText("Full name")).toHaveValue("")
    await user.click(screen.getByRole("button", { name: "Add address" }))
    expect(
      await screen.findByText("Enter the recipient's name")
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Mobile number")).toBeInvalid()
    expect(screen.getByLabelText("Mobile number")).toHaveAccessibleDescription(
      /valid 10-digit/i
    )
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("a 422 from the server lands under the right field", async () => {
    const onSubmit = vi.fn().mockResolvedValue(
      new ApiError({
        status: 422,
        code: "VALIDATION_ERROR",
        message: "bad",
        details: [{ path: "line1", message: "That street is not valid" }],
      })
    )
    const { user } = await renderWithProviders(
      <AddressFormDialog
        target={existing}
        pending={false}
        onClose={() => {}}
        onSubmit={onSubmit}
      />
    )
    await user.click(
      await screen.findByRole("button", { name: "Save changes" })
    )
    expect(
      await screen.findByText("That street is not valid")
    ).toBeInTheDocument()
    expect(screen.getByLabelText("House, street")).toBeInvalid()
    expect(screen.getByLabelText("House, street")).toHaveFocus()
  })

  it("a successful save closes the dialog", async () => {
    const onClose = vi.fn()
    const { user } = await renderWithProviders(
      <AddressFormDialog
        target={existing}
        pending={false}
        onClose={onClose}
        onSubmit={async () => null}
      />
    )
    await user.click(
      await screen.findByRole("button", { name: "Save changes" })
    )
    await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it("Escape closes it", async () => {
    const onClose = vi.fn()
    const { user } = await renderWithProviders(
      <AddressFormDialog
        target="new"
        pending={false}
        onClose={onClose}
        onSubmit={async () => null}
      />
    )
    await screen.findByRole("dialog")
    await user.keyboard("{Escape}")
    expect(onClose).toHaveBeenCalled()
  })
})
