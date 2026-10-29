import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "@/lib/zod"

import { FormError } from "@/components/form/FormError"
import { FormField } from "@/components/form/FormField"
import { Button } from "@/components/ui/button"
import { passwordField } from "@/features/auth"
import { useSingleFlight } from "@/hooks/useSingleFlight"
import { toApiError } from "@/lib/api/errors"
import { applyApiError } from "@/lib/forms/applyApiError"
import { authKeys } from "@/lib/queryKeys"

import { changePassword } from "../security.api"

const schema = z
  .object({
    currentPassword: z
      .string()
      .min(1, { error: "Enter your current password" }),
    newPassword: passwordField,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    error: "Passwords do not match",
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ["newPassword"],
    error: "Choose a password you have not used just now",
  })
type Values = z.output<typeof schema>

/** Current + new + confirm. The server ends every OTHER session and keeps this one. */
export function ChangePasswordForm() {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = useSingleFlight(async (values: Values) => {
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      reset()
      toast.success("Password changed. Your other devices were signed out.")
      void queryClient.invalidateQueries({ queryKey: authKeys.sessions })
    } catch (err) {
      applyApiError(toApiError(err), setError, {
        fields: ["currentPassword", "newPassword"],
        codes: {
          INVALID_CREDENTIALS: {
            field: "currentPassword",
            message: "That is not your current password.",
          },
        },
      })
    }
  })
  const submit = handleSubmit(onSubmit)

  return (
    <form onSubmit={submit} noValidate className="flex max-w-sm flex-col gap-3">
      <FormError
        error={errors.root?.server}
        onRetry={() => void submit()}
        retrying={isSubmitting}
      />
      <FormField
        label="Current password"
        error={errors.currentPassword?.message}
      >
        {(c) => (
          <input
            type="password"
            autoComplete="current-password"
            className="rounded border p-1"
            {...c}
            {...register("currentPassword")}
          />
        )}
      </FormField>
      <FormField
        label="New password"
        hint="At least 8 characters, with upper and lower case letters and a number."
        error={errors.newPassword?.message}
      >
        {(c) => (
          <input
            type="password"
            autoComplete="new-password"
            className="rounded border p-1"
            {...c}
            {...register("newPassword")}
          />
        )}
      </FormField>
      <FormField
        label="Confirm new password"
        error={errors.confirmPassword?.message}
      >
        {(c) => (
          <input
            type="password"
            autoComplete="new-password"
            className="rounded border p-1"
            {...c}
            {...register("confirmPassword")}
          />
        )}
      </FormField>
      <Button type="submit" className="self-start" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Change password"}
      </Button>
    </form>
  )
}
