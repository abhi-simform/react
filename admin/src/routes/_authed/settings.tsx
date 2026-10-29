import { zodResolver } from "@hookform/resolvers/zod"
import { createFileRoute } from "@tanstack/react-router"
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import * as api from "@/features/system/api"
import { isApiError } from "@/lib/api/errors"
import { requirePermission } from "@/lib/auth/guards"
import { qk } from "@/lib/queryKeys"

const settingsOptions = () =>
  queryOptions({
    queryKey: qk.system.settings(),
    queryFn: ({ signal }) => api.getSettings(signal),
  })

export const Route = createFileRoute("/_authed/settings")({
  staticData: { crumb: "Settings" },
  beforeLoad: ({ context }) => requirePermission(context.user, "system:view"),
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(settingsOptions())
  },
  component: SettingsPage,
})

export const settingsFormSchema = z.object({
  storeName: z.string().trim().min(1, "Required").max(60),
  supportEmail: z.email("Enter a valid email").max(120),
  lowStockThreshold: z
    .number({ error: "Enter a whole number" })
    .int("Whole numbers only")
    .min(0)
    .max(1000),
  announcement: z.string().trim().max(200),
})
type Values = z.infer<typeof settingsFormSchema>

function SettingsPage() {
  const { data, error } = useQuery(settingsOptions())
  if (error) return <p role="alert">{error.message}</p>
  if (!data) return <p aria-busy>Loading settings...</p>
  return (
    <section className="flex max-w-xl flex-col gap-6">
      <h1 className="text-lg font-medium">Settings</h1>
      <SettingsForm initial={data.editable} />
      <section aria-labelledby="ro">
        <h2 id="ro" className="mb-1 font-medium">
          Fixed by the platform
        </h2>
        <p className="mb-2 text-sm text-muted-foreground">
          These come from code or environment variables and cannot be changed
          here.
        </p>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          {Object.entries(data.readOnly).map(([k, v]) => (
            <div key={k} className="contents">
              <dt>{k}</dt>
              <dd className="break-all">
                {Array.isArray(v) ? v.join(", ") : String(v)}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </section>
  )
}

function SettingsForm({ initial }: { initial: api.Settings }) {
  const queryClient = useQueryClient()
  const form = useForm<Values>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: initial,
  })
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = form
  const save = useMutation({
    mutationFn: (v: Values) => api.updateSettings(v),
    onSuccess: async (saved) => {
      toast.success("Settings saved")
      reset(saved) // the saved values are the new baseline
      await queryClient.invalidateQueries({ queryKey: qk.system.settings() })
      await queryClient.invalidateQueries({ queryKey: qk.analytics.all() }) // the low-stock threshold changed
    },
    onError: (e) => {
      if (isApiError(e) && Object.keys(e.fieldErrors).length)
        for (const [p, m] of Object.entries(e.fieldErrors))
          setError(p as keyof Values, { type: "server", message: m })
      else toast.error(e.message)
    },
  })
  const num = (v: unknown) => (v === "" ? Number.NaN : Number(v))
  const Err = ({ k }: { k: keyof Values }) =>
    errors[k] ? (
      <p role="alert" className="text-sm text-destructive">
        {errors[k].message}
      </p>
    ) : null
  return (
    <form
      className="flex flex-col gap-3"
      noValidate
      onSubmit={handleSubmit((v) => save.mutate(v))}
    >
      <Label htmlFor="s-name">Store name</Label>
      <Input
        id="s-name"
        {...register("storeName")}
        aria-invalid={!!errors.storeName}
      />
      <Err k="storeName" />
      <Label htmlFor="s-mail">Support email</Label>
      <Input
        id="s-mail"
        type="email"
        {...register("supportEmail")}
        aria-invalid={!!errors.supportEmail}
      />
      <Err k="supportEmail" />
      <Label htmlFor="s-low">Low-stock threshold (units)</Label>
      <Input
        id="s-low"
        inputMode="numeric"
        {...register("lowStockThreshold", { setValueAs: num })}
        aria-invalid={!!errors.lowStockThreshold}
      />
      <Err k="lowStockThreshold" />
      <Label htmlFor="s-ann">Announcement (optional)</Label>
      <Input id="s-ann" {...register("announcement")} />
      <Err k="announcement" />
      <div>
        <Button type="submit" disabled={!isDirty || save.isPending}>
          {save.isPending ? "Saving..." : "Save settings"}
        </Button>
      </div>
    </form>
  )
}
