import { z } from "zod"

import { api } from "@/lib/api/client"

import {
  addressSchema,
  deleteAddressResultSchema,
  type Address,
  type AddressInput,
  type DeleteAddressResult,
} from "./schemas"

// Every call needs the signed-in user: `auth: true` attaches the bearer token.

export const getAddresses = (signal?: AbortSignal): Promise<Address[]> =>
  api("/addresses", { schema: z.array(addressSchema), auth: true, signal })

export const createAddress = (input: AddressInput): Promise<Address> =>
  api("/addresses", {
    method: "POST",
    body: input,
    schema: addressSchema,
    auth: true,
  })

export const updateAddress = (
  id: string,
  input: Partial<AddressInput>
): Promise<Address> =>
  api(`/addresses/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: input,
    schema: addressSchema,
    auth: true,
  })

export const setDefaultAddress = (id: string): Promise<Address> =>
  api(`/addresses/${encodeURIComponent(id)}/default`, {
    method: "POST",
    schema: addressSchema,
    auth: true,
  })

export const deleteAddress = (id: string): Promise<DeleteAddressResult> =>
  api(`/addresses/${encodeURIComponent(id)}`, {
    method: "DELETE",
    schema: deleteAddressResultSchema,
    auth: true,
  })
