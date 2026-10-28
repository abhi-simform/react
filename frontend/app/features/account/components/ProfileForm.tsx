import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { AsyncView } from "@/components/common/AsyncView"
import { FormError } from "@/components/form/FormError"
import { FormField } from "@/components/form/FormField"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { profileKeys } from "@/lib/queryKeys"
import { toAsyncState } from "@/lib/queryState"
import { useSingleFlight } from "@/hooks/useSingleFlight"
import { toApiError } from "@/lib/api/errors"
import { applyApiError } from "@/lib/forms/applyApiError"

import {
  profileFormSchema,
  updateProfile,
  type Profile,
  type ProfileFormInput,
  type ProfileFormOutput,
} from "../profile.api"
import { profileQueries } from "../queries"
import { AvatarUploader } from "./AvatarUploader"

/** /account/profile (7.8): name and phone through RHF + Zod, and the avatar uploader. */
export function ProfileForm() {
  const queryClient = useQueryClient()
  const profile = toAsyncState(useQuery(profileQueries.me()))
  const setProfile = (saved: Profile) =>
    queryClient.setQueryData(profileKeys.me(), saved)
  return (
    <div className="flex max-w-md flex-col gap-4">
      <h1 className="text-xl font-medium">Profile</h1>
      <AsyncView state={profile} loading={<Skeleton className="h-40 w-full" />}>
        {(data) => (
          <>
            <AvatarUploader
              currentUrl={data.avatarUrl}
              name={data.name}
              onUploaded={async (url) => {
                const saved = await updateProfile({ avatarUrl: url })
                setProfile(saved)
                toast.success("Photo updated")
              }}
            />
            <DetailsForm key={data.id} profile={data} onSaved={setProfile} />
          </>
        )}
      </AsyncView>
    </div>
  )
}

function DetailsForm({
  profile,
  onSaved,
}: {
  profile: Profile
  onSaved: (saved: Profile) => void
}) {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormInput, unknown, ProfileFormOutput>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { name: profile.name, phone: profile.phone ?? "" },
  })

  const save = useSingleFlight(async (values: ProfileFormOutput) => {
    try {
      const saved = await updateProfile({
        name: values.name,
        ...(values.phone ? { phone: values.phone } : {}),
      })
      onSaved(saved)
      reset({ name: saved.name, phone: saved.phone ?? "" }) // saved values are the new baseline: not dirty any more
      toast.success("Profile saved")
    } catch (err) {
      applyApiError(toApiError(err), setError, { fields: ["name", "phone"] })
    }
  })
  const submit = handleSubmit(save)

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <FormError
        error={errors.root?.server}
        onRetry={() => void submit()}
        retrying={isSubmitting}
      />
      <FormField label="Full name" error={errors.name?.message}>
        {(c) => (
          <input
            autoComplete="name"
            className="rounded border p-1"
            {...c}
            {...register("name")}
          />
        )}
      </FormField>
      <FormField label="Email" hint="Your email cannot be changed here.">
        {(c) => (
          <input
            className="rounded border bg-neutral-100 p-1"
            value={profile.email}
            readOnly
            {...c}
          />
        )}
      </FormField>
      <FormField label="Mobile number (optional)" error={errors.phone?.message}>
        {(c) => (
          <input
            inputMode="numeric"
            autoComplete="tel-national"
            className="rounded border p-1"
            {...c}
            {...register("phone")}
          />
        )}
      </FormField>
      <Button
        type="submit"
        className="self-start"
        disabled={isSubmitting || !isDirty}
      >
        {isSubmitting ? "Saving..." : "Save changes"}
      </Button>
    </form>
  )
}
