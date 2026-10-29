import { useRef, useState } from "react"
import { useBlocker, useNavigate } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  FormProvider,
  useFieldArray,
  useForm,
  useFormContext,
  type FieldErrors,
} from "react-hook-form"
import { toast } from "sonner"

import { NativeSelect } from "@/components/native-select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  flattenTree,
  listPublicBrands,
  listPublicCategories,
} from "@/features/categories/api"
import { isApiError } from "@/lib/api/errors"
import { can } from "@/lib/auth/can"
import { getUser } from "@/lib/auth/session"
import { qk } from "@/lib/queryKeys"
import * as api from "./api"
import { ImagesField } from "./ImagesField"
import {
  TAB_OF_FIELD,
  emptyProduct,
  productFormSchema,
  serverPathToField,
  toRequestBody,
  type ProductFormValues,
} from "./schema"

type Tab = "general" | "pricing" | "variants" | "images" | "specs" | "seo"
const TABS: { id: Tab; label: string }[] = [
  { id: "general", label: "General" },
  { id: "pricing", label: "Pricing & stock" },
  { id: "variants", label: "Variants" },
  { id: "images", label: "Images" },
  { id: "specs", label: "Specs" },
  { id: "seo", label: "SEO" },
]

/** Which tabs hold a validation error (shown as "(!)" so an error on another tab is not invisible). */
function tabsWithErrors(errors: FieldErrors<ProductFormValues>): Set<Tab> {
  const out = new Set<Tab>()
  for (const key of Object.keys(errors)) {
    const tab = TAB_OF_FIELD[key]
    if (tab) out.add(tab)
  }
  return out
}

export function ProductForm({
  productId,
  defaults = emptyProduct,
}: {
  /** Undefined = create. */
  productId?: string
  defaults?: ProductFormValues
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isAdmin = can(getUser(), "categories:manage")
  const [tab, setTab] = useState<Tab>("general")
  const [formError, setFormError] = useState<string | null>(null)
  const saved = useRef(false) // set right before the post-save navigation so the blocker lets it pass

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: defaults,
  })
  const { handleSubmit, setError, formState, reset } = form

  const save = useMutation({
    mutationFn: (values: ProductFormValues) => {
      const body = toRequestBody(values, { admin: isAdmin })
      return productId
        ? api.updateProduct(productId, body)
        : api.createProduct(body)
    },
    onSuccess: async (product, values) => {
      // Successful save clears the dirty state: reset() makes the saved values the new baseline.
      reset(values)
      saved.current = true
      toast.success(productId ? "Product saved" : "Product created")
      await queryClient.invalidateQueries({ queryKey: qk.products.all() })
      if (!productId)
        await navigate({
          to: "/products/$productId",
          params: { productId: product._id },
        })
      else saved.current = false
    },
    onError: (err) => {
      if (!isApiError(err)) return setFormError("Could not reach the server")
      const fields = err.fieldErrors
      const paths = Object.keys(fields)
      // 422 (and the 409 duplicate SKU) carry dotted paths: put each message under its own input.
      paths.forEach((path) =>
        setError(serverPathToField(path) as keyof ProductFormValues, {
          type: "server",
          message: fields[path],
        })
      )
      setFormError(
        paths.length
          ? "The server rejected some fields (marked below)."
          : err.message
      )
      const first = paths[0]
        ? TAB_OF_FIELD[serverPathToField(paths[0]).split(".")[0] ?? ""]
        : undefined
      if (first) setTab(first)
    },
  })

  // Unsaved-changes protection: in-app navigation (router blocker, with our own dialog) and tab
  // close/reload (the browser's beforeunload prompt).
  const blocker = useBlocker({
    shouldBlockFn: () => formState.isDirty && !saved.current,
    enableBeforeUnload: () => formState.isDirty && !saved.current,
    withResolver: true,
  })

  const onInvalid = (errors: FieldErrors<ProductFormValues>) => {
    setFormError("Fix the marked fields before saving.")
    const first = Array.from(tabsWithErrors(errors)).at(0)
    if (first) setTab(first)
  }

  const errTabs = tabsWithErrors(formState.errors)

  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={handleSubmit((v) => {
          setFormError(null)
          save.mutate(v)
        }, onInvalid)}
        className="flex max-w-3xl flex-col gap-4"
      >
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.id} value={t.id}>
                {t.label}
                {errTabs.has(t.id) ? (
                  <span aria-label="has errors"> (!)</span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="general" keepMounted>
            <GeneralTab isAdmin={isAdmin} />
          </TabsContent>
          <TabsContent value="pricing" keepMounted>
            <PricingTab />
          </TabsContent>
          <TabsContent value="variants" keepMounted>
            <VariantsTab />
          </TabsContent>
          <TabsContent value="images" keepMounted>
            <ImagesField />
          </TabsContent>
          <TabsContent value="specs" keepMounted>
            <SpecsTab />
          </TabsContent>
          <TabsContent value="seo" keepMounted>
            <SeoTab />
          </TabsContent>
        </Tabs>

        {formError ? (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        ) : null}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending
              ? "Saving..."
              : productId
                ? "Save changes"
                : "Create product"}
          </Button>
          {formState.isDirty ? (
            <span className="text-sm text-muted-foreground">
              Unsaved changes
            </span>
          ) : null}
        </div>
      </form>

      <AlertDialog open={blocker.status === "blocked"}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
            <AlertDialogDescription>
              Your edits to this product will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => blocker.reset?.()}>
              Keep editing
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => blocker.proceed?.()}>
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FormProvider>
  )
}

/** The message of `errors.<array>[i].<key>` (react-hook-form's error types for arrays are awkward). */
function rowError(errs: unknown, i: number, key: string): string | undefined {
  const rows = errs as
    | Record<
        number,
        Record<string, { message?: string } | undefined> | undefined
      >
    | undefined
  return rows?.[i]?.[key]?.message
}

// ---- field helpers ------------------------------------------------------------------------------

function Field({
  label,
  error,
  children,
  htmlFor,
}: {
  label: string
  htmlFor: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}

/** `aria-invalid` + `aria-describedby` so a screen reader lands on the message with the input. */
const a11y = (id: string, error?: string) => ({
  id,
  "aria-invalid": !!error,
  "aria-describedby": error ? `${id}-error` : undefined,
})

// ---- tabs -----------------------------------------------------------------------------------------

function GeneralTab({ isAdmin }: { isAdmin: boolean }) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ProductFormValues>()
  const highlights = useFieldArray({ control, name: "highlights" })
  const categories = useQuery({
    queryKey: qk.categories.public(),
    queryFn: listPublicCategories,
    staleTime: 5 * 60_000,
  })
  const brands = useQuery({
    queryKey: qk.brands.all(),
    queryFn: listPublicBrands,
    staleTime: 5 * 60_000,
  })
  return (
    <div className="flex flex-col gap-3 pt-3">
      <Field label="Name" htmlFor="name" error={errors.name?.message}>
        <Input {...a11y("name", errors.name?.message)} {...register("name")} />
      </Field>
      <Field label="Brand" htmlFor="brand" error={errors.brand?.message}>
        <Input
          list="brand-options"
          {...a11y("brand", errors.brand?.message)}
          {...register("brand")}
        />
        <datalist id="brand-options">
          {brands.data?.map((b) => (
            <option key={b.name} value={b.name} />
          ))}
        </datalist>
      </Field>
      <Field
        label="Category"
        htmlFor="categoryId"
        error={errors.categoryId?.message}
      >
        <NativeSelect
          {...a11y("categoryId", errors.categoryId?.message)}
          {...register("categoryId")}
        >
          <option value="">Select a category</option>
          {flattenTree(categories.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Status" htmlFor="status" error={errors.status?.message}>
        <NativeSelect
          {...a11y("status", errors.status?.message)}
          {...register("status")}
        >
          <option value="draft">Draft (hidden)</option>
          <option value="active">Active (on the storefront)</option>
          <option value="archived">Archived</option>
        </NativeSelect>
      </Field>
      {isAdmin ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("isFeatured")} /> Featured on the
          storefront
        </label>
      ) : null}
      <Field
        label="Description"
        htmlFor="description"
        error={errors.description?.message}
      >
        <Textarea
          rows={5}
          {...a11y("description", errors.description?.message)}
          {...register("description")}
        />
      </Field>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Highlights (up to 10)</legend>
        {highlights.fields.map((f, i) => (
          <div key={f.id} className="flex items-start gap-2">
            <div className="flex-1">
              <Input
                aria-label={`Highlight ${i + 1}`}
                aria-invalid={!!rowError(errors.highlights, i, "value")}
                {...register(`highlights.${i}.value`)}
              />
              {rowError(errors.highlights, i, "value") ? (
                <p role="alert" className="text-sm text-destructive">
                  {rowError(errors.highlights, i, "value")}
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => highlights.remove(i)}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-fit"
          disabled={highlights.fields.length >= 10}
          onClick={() => highlights.append({ value: "" })}
        >
          Add highlight
        </Button>
      </fieldset>
    </div>
  )
}

function PricingTab() {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<ProductFormValues>()
  const variants = watch("variants")
  const derived = variants.reduce(
    (n, v) => n + (Number.isFinite(v.stock) ? v.stock : 0),
    0
  )
  const num = { valueAsNumber: true } as const // "" -> NaN -> "Enter a price"; "99.5" -> 99.5 -> "Whole rupees only"
  return (
    <div className="grid grid-cols-2 gap-3 pt-3">
      <Field
        label="Selling price (₹)"
        htmlFor="price"
        error={errors.price?.message}
      >
        <Input
          inputMode="numeric"
          {...a11y("price", errors.price?.message)}
          {...register("price", num)}
        />
      </Field>
      <Field label="MRP (₹)" htmlFor="mrp" error={errors.mrp?.message}>
        <Input
          inputMode="numeric"
          {...a11y("mrp", errors.mrp?.message)}
          {...register("mrp", num)}
        />
      </Field>
      <Field
        label={
          variants.length ? `Stock (sum of variants: ${derived})` : "Stock"
        }
        htmlFor="stock"
        error={errors.stock?.message}
      >
        <Input
          inputMode="numeric"
          disabled={variants.length > 0}
          {...a11y("stock", errors.stock?.message)}
          {...register("stock", num)}
        />
      </Field>
      <Field label="SKU" htmlFor="sku" error={errors.sku?.message}>
        <Input {...a11y("sku", errors.sku?.message)} {...register("sku")} />
      </Field>
    </div>
  )
}

function VariantsTab() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ProductFormValues>()
  const { fields, append, remove } = useFieldArray({
    control,
    name: "variants",
  })
  const num = { valueAsNumber: true } as const
  return (
    <div className="flex flex-col gap-3 pt-3">
      <p className="text-sm text-muted-foreground">
        Optional. With variants, product stock is the sum of the variants'
        stock.
      </p>
      {fields.map((f, i) => {
        const e = errors.variants?.[i]
        return (
          <fieldset
            key={f.id}
            className="grid grid-cols-5 gap-2 rounded border p-2"
          >
            <legend className="px-1 text-sm">Variant {i + 1}</legend>
            <Field
              label="SKU"
              htmlFor={`variants-${i}-sku`}
              error={e?.sku?.message}
            >
              <Input
                {...a11y(`variants-${i}-sku`, e?.sku?.message)}
                {...register(`variants.${i}.sku`)}
              />
            </Field>
            <Field
              label="Color"
              htmlFor={`variants-${i}-color`}
              error={e?.color?.message}
            >
              <Input
                id={`variants-${i}-color`}
                {...register(`variants.${i}.color`)}
              />
            </Field>
            <Field
              label="Size"
              htmlFor={`variants-${i}-size`}
              error={e?.size?.message}
            >
              <Input
                id={`variants-${i}-size`}
                {...register(`variants.${i}.size`)}
              />
            </Field>
            <Field
              label="Price (₹)"
              htmlFor={`variants-${i}-price`}
              error={e?.price?.message}
            >
              <Input
                inputMode="numeric"
                {...a11y(`variants-${i}-price`, e?.price?.message)}
                {...register(`variants.${i}.price`, num)}
              />
            </Field>
            <Field
              label="Stock"
              htmlFor={`variants-${i}-stock`}
              error={e?.stock?.message}
            >
              <Input
                inputMode="numeric"
                {...a11y(`variants-${i}-stock`, e?.stock?.message)}
                {...register(`variants.${i}.stock`, num)}
              />
            </Field>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="col-span-5 w-fit"
              onClick={() => remove(i)}
            >
              Remove variant {i + 1}
            </Button>
          </fieldset>
        )
      })}
      <Button
        type="button"
        variant="outline"
        className="w-fit"
        disabled={fields.length >= 50}
        onClick={() =>
          append({ sku: "", color: "", size: "", price: 0, stock: 0 })
        }
      >
        Add variant
      </Button>
    </div>
  )
}

function SpecsTab() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ProductFormValues>()
  const { fields, append, remove } = useFieldArray({ control, name: "specs" })
  return (
    <div className="flex flex-col gap-3 pt-3">
      {fields.map((f, i) => (
        <div
          key={f.id}
          className="grid grid-cols-[1fr_2fr_auto] items-start gap-2"
        >
          <div>
            <Input
              aria-label={`Spec ${i + 1} name`}
              placeholder="Name (RAM)"
              aria-invalid={!!rowError(errors.specs, i, "key")}
              {...register(`specs.${i}.key`)}
            />
            {rowError(errors.specs, i, "key") ? (
              <p role="alert" className="text-sm text-destructive">
                {rowError(errors.specs, i, "key")}
              </p>
            ) : null}
          </div>
          <div>
            <Input
              aria-label={`Spec ${i + 1} value`}
              placeholder="Value (8 GB)"
              aria-invalid={!!rowError(errors.specs, i, "value")}
              {...register(`specs.${i}.value`)}
            />
            {rowError(errors.specs, i, "value") ? (
              <p role="alert" className="text-sm text-destructive">
                {rowError(errors.specs, i, "value")}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => remove(i)}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        className="w-fit"
        disabled={fields.length >= 30}
        onClick={() => append({ key: "", value: "" })}
      >
        Add spec
      </Button>
    </div>
  )
}

function SeoTab() {
  const {
    register,
    formState: { errors },
  } = useFormContext<ProductFormValues>()
  return (
    <div className="flex flex-col gap-3 pt-3">
      <Field
        label="URL slug (leave empty to generate from the name)"
        htmlFor="slug"
        error={errors.slug?.message}
      >
        <Input {...a11y("slug", errors.slug?.message)} {...register("slug")} />
      </Field>
      <Field
        label="Tags (comma separated)"
        htmlFor="tags"
        error={errors.tags?.message}
      >
        <Input {...a11y("tags", errors.tags?.message)} {...register("tags")} />
      </Field>
    </div>
  )
}
