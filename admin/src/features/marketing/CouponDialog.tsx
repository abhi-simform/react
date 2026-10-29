import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { DateRangeField } from "@/components/DateRangeField"
import { NativeSelect } from "@/components/native-select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { isApiError } from "@/lib/api/errors"
import { qk } from "@/lib/queryKeys"
import { createCoupon, updateCoupon } from "./api"
import {
  couponFormSchema,
  describeCoupon,
  toCouponBody,
  type CouponFormOutput,
  type CouponFormValues,
} from "./couponSchema"
import { toIstDay } from "./dates"
import type { Coupon } from "./types"

const toForm = (c: Coupon | null): CouponFormValues =>
  c
    ? {
        code: c.code,
        description: c.description,
        type: c.type,
        value: c.value,
        maxDiscount: c.maxDiscount,
        minOrder: c.minOrder,
        firstOrderOnly: c.firstOrderOnly,
        startDay: c.startsAt ? toIstDay(c.startsAt) : undefined,
        endDay: c.expiresAt ? toIstDay(c.expiresAt) : undefined,
        usageLimit: c.usageLimit,
        perUserLimit: c.perUserLimit,
        isActive: c.isActive,
      }
    : {
        code: "",
        description: "",
        type: "percent",
        value: 10,
        maxDiscount: undefined,
        minOrder: 0,
        firstOrderOnly: false,
        startDay: undefined,
        endDay: undefined,
        usageLimit: undefined,
        perUserLimit: 1,
        isActive: true,
      }

const num = (v: unknown) => (v === "" ? undefined : Number(v))

export function CouponDialog({
  coupon,
  onClose,
}: {
  coupon: Coupon | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const form = useForm<CouponFormValues, unknown, CouponFormOutput>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: toForm(coupon),
  })
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    formState: { errors },
  } = form
  const w = useWatch({ control })

  const save = useMutation({
    mutationFn: (v: CouponFormOutput) =>
      coupon
        ? updateCoupon(coupon._id, toCouponBody(v))
        : createCoupon(toCouponBody(v)),
    onSuccess: async () => {
      toast.success(coupon ? "Coupon saved" : "Coupon created")
      await queryClient.invalidateQueries({ queryKey: qk.marketing.coupons() })
      onClose()
    },
    onError: (e) => {
      if (isApiError(e)) {
        const f = e.fieldErrors
        // API field names -> form field names
        const map: Record<string, keyof CouponFormValues> = {
          expiresAt: "endDay",
          startsAt: "startDay",
        }
        if (e.code === "COUPON_CODE_TAKEN")
          return setError("code", { message: "That code already exists" })
        const entries = Object.entries(f)
        if (entries.length)
          for (const [path, message] of entries)
            setError(map[path] ?? path, {
              type: "server",
              message,
            })
        else toast.error(e.message)
      } else toast.error(e.message)
    },
  })

  const err = (k: keyof CouponFormValues) => errors[k]?.message
  const field = (k: keyof CouponFormValues) => ({
    "aria-invalid": !!errors[k],
    "aria-describedby": errors[k] ? `c-${k}-err` : undefined,
  })
  const Err = ({ k }: { k: keyof CouponFormValues }) =>
    err(k) ? (
      <p id={`c-${k}-err`} role="alert" className="text-sm text-destructive">
        {err(k)}
      </p>
    ) : null

  const preview =
    typeof w.value === "number" && !Number.isNaN(w.value)
      ? describeCoupon({
          type: w.type ?? "percent",
          value: w.value,
          maxDiscount:
            typeof w.maxDiscount === "number" ? w.maxDiscount : undefined,
          minOrder: typeof w.minOrder === "number" ? w.minOrder : 0,
          firstOrderOnly: !!w.firstOrderOnly,
        })
      : "..."

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {coupon ? `Edit ${coupon.code}` : "New coupon"}
          </DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={handleSubmit((v) => save.mutate(v))}
          noValidate
        >
          <Label htmlFor="c-code">Code</Label>
          <Input id="c-code" {...register("code")} {...field("code")} />
          <Err k="code" />
          <Label htmlFor="c-desc">Description (shown to customers)</Label>
          <Input id="c-desc" {...register("description")} />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="c-type">Type</Label>
              <NativeSelect id="c-type" {...register("type")}>
                <option value="percent">Percent off</option>
                <option value="flat">Flat rupees off</option>
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="c-value">
                {w.type === "flat" ? "Amount (₹)" : "Percent (1-100)"}
              </Label>
              <Input
                id="c-value"
                inputMode="numeric"
                {...register("value", { setValueAs: num })}
                {...field("value")}
              />
              <Err k="value" />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="c-min">Minimum cart (₹)</Label>
              <Input
                id="c-min"
                inputMode="numeric"
                {...register("minOrder", { setValueAs: num })}
                {...field("minOrder")}
              />
              <Err k="minOrder" />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="c-max">Max discount (₹, percent only)</Label>
              <Input
                id="c-max"
                inputMode="numeric"
                disabled={w.type === "flat"}
                {...register("maxDiscount", { setValueAs: num })}
                {...field("maxDiscount")}
              />
              <Err k="maxDiscount" />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="c-limit">Total uses (blank = unlimited)</Label>
              <Input
                id="c-limit"
                inputMode="numeric"
                {...register("usageLimit", { setValueAs: num })}
                {...field("usageLimit")}
              />
              <Err k="usageLimit" />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="c-per">Uses per customer</Label>
              <Input
                id="c-per"
                inputMode="numeric"
                {...register("perUserLimit", { setValueAs: num })}
                {...field("perUserLimit")}
              />
              <Err k="perUserLimit" />
            </div>
          </div>
          <Label className="gap-2">
            <Checkbox
              checked={!!w.firstOrderOnly}
              onCheckedChange={(v) => setValue("firstOrderOnly", !!v)}
            />
            First order only
          </Label>
          <Label className="gap-2">
            <Checkbox
              checked={!!w.isActive}
              onCheckedChange={(v) => setValue("isActive", !!v)}
            />
            Active (switched on)
          </Label>
          <DateRangeField
            label="Valid from / until (India days)"
            from={w.startDay}
            to={w.endDay}
            error={err("endDay") ?? err("startDay")}
            onChange={(r) => {
              setValue("startDay", r.from, { shouldValidate: true })
              setValue("endDay", r.to, { shouldValidate: true })
            }}
          />
          <section
            aria-label="Customer preview"
            className="rounded border border-dashed p-3 text-sm"
          >
            <p className="mb-1 text-xs text-muted-foreground">
              How it shows to the customer
            </p>
            <p className="font-mono font-medium">
              {w.code?.toUpperCase() || "CODE"}
            </p>
            <p>{w.description || "(no description)"}</p>
            <p>{preview}</p>
            {w.endDay ? <p>Valid until {w.endDay}</p> : null}
          </section>
          <DialogFooter>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving..." : "Save coupon"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
