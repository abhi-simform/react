import mongoose from "mongoose"
import { ApiError } from "../../utils/ApiError.js"
import { checkPincode } from "../pincodes/pincode.service.js"
import { Address, MAX_ADDRESSES, toPublicAddress } from "./address.model.js"
import type { z } from "zod"
import type { createAddressSchema, updateAddressSchema } from "./address.schema.js"

type CreateInput = z.output<typeof createAddressSchema.body>
type UpdateInput = z.output<typeof updateAddressSchema.body>

function assertServiceable(pincode: string) {
  if (!checkPincode(pincode).serviceable)
    throw new ApiError(422, "VALIDATION_ERROR", "Validation failed", [
      { in: "body", path: "pincode", message: "We do not deliver to this pincode yet" },
    ])
}

async function findOwned(userId: string, id: string, session?: mongoose.ClientSession) {
  const doc = await Address.findOne({ _id: id, user: userId }).session(session ?? null)
  // Someone else's address looks exactly like a missing one: never leak existence.
  if (!doc) throw ApiError.notFound("Address not found")
  return doc
}

/** Default first, then newest. */
export async function list(userId: string) {
  const rows = await Address.find({ user: userId }).sort({
    isDefault: -1,
    createdAt: -1,
    _id: 1,
  })
  return rows.map(toPublicAddress)
}

export async function create(userId: string, input: CreateInput) {
  assertServiceable(input.pincode)
  return mongoose.connection.transaction(async (session) => {
    const count = await Address.countDocuments({ user: userId }).session(session)
    if (count >= MAX_ADDRESSES)
      throw ApiError.conflict(
        `You can save at most ${MAX_ADDRESSES} addresses`,
        "ADDRESS_LIMIT"
      )
    // The first address is always the default; otherwise only when asked.
    const makeDefault = count === 0 || input.isDefault === true
    if (makeDefault)
      await Address.updateMany(
        { user: userId, isDefault: true },
        { isDefault: false },
        { session }
      )
    const [doc] = await Address.create(
      [{ ...input, user: userId, isDefault: makeDefault }],
      {
        session,
      }
    )
    return toPublicAddress(doc!)
  })
}

export async function update(userId: string, id: string, input: UpdateInput) {
  if (input.pincode) assertServiceable(input.pincode)
  const doc = await findOwned(userId, id)
  doc.set(input)
  await doc.save()
  return toPublicAddress(doc)
}

export async function setDefault(userId: string, id: string) {
  return mongoose.connection.transaction(async (session) => {
    const doc = await findOwned(userId, id, session)
    if (!doc.isDefault) {
      await Address.updateMany(
        { user: userId, isDefault: true },
        { isDefault: false },
        { session }
      )
      doc.isDefault = true
      await doc.save({ session })
    }
    return toPublicAddress(doc)
  })
}

/**
 * Deleting the default address auto-promotes the most recently created remaining address, so a
 * user who has addresses always has a default. The response tells the UI which one was promoted.
 */
export async function remove(userId: string, id: string) {
  return mongoose.connection.transaction(async (session) => {
    const doc = await findOwned(userId, id, session)
    await doc.deleteOne({ session })
    let newDefaultId: string | null = null
    if (doc.isDefault) {
      const next = await Address.findOne({ user: userId })
        .sort({ createdAt: -1, _id: 1 })
        .session(session)
      if (next) {
        next.isDefault = true
        await next.save({ session })
        newDefaultId = next.id as string
      }
    }
    return { deletedId: id, newDefaultId }
  })
}
