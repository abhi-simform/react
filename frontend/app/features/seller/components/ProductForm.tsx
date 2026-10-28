import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import {
  Controller,
  useFieldArray,
  useForm,
  type DefaultValues,
} from "react-hook-form"

import { AsyncView } from "@/components/common/AsyncView"
import { FormField } from "@/components/form/FormField"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCategoryTree, type CategoryNode } from "@/features/catalog"
import { ImageDropzone } from "@/features/uploads"

import {
  productFormSchema,
  type ProductFormInput,
  type ProductFormOutput,
} from "../schemas"

const EMPTY_VARIANT = {
  sku: "",
  color: "",
  size: "",
  price: "",
  mrp: "",
  stock: "",
}

const DEFAULTS: DefaultValues<ProductFormInput> = {
  title: "",
  brand: "",
  category: "",
  description: "",
  images: [],
  variants: [EMPTY_VARIANT],
  specs: [],
}

/** Flatten the tree to "Men / T-shirts" style options (leaf and inner nodes both selectable). */
function categoryOptions(
  nodes: CategoryNode[],
  trail: string[] = []
): { slug: string; label: string }[] {
  return nodes.flatMap((n) => [
    { slug: n.slug, label: [...trail, n.name].join(" / ") },
    ...categoryOptions(n.children, [...trail, n.name]),
  ])
}

/**
 * 7.5 seller product form. `variants[]` and `specs[]` are `useFieldArray`s: `fields` carry a
 * stable generated `id` that MUST be the React `key` (not the index), so removing a middle
 * row keeps every other row's DOM node, typed value and error attached to the right row.
 * Submit prints the typed payload (the real endpoint is B11).
 */
export function ProductForm() {
  const categories = useCategoryTree()
  const [payload, setPayload] = useState<ProductFormOutput>()
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormInput, unknown, ProductFormOutput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: DEFAULTS,
  })
  const variants = useFieldArray({ control, name: "variants" })
  const specs = useFieldArray({ control, name: "specs" })

  function onSubmit(values: ProductFormOutput) {
    console.log("seller product payload", values)
    setPayload(values)
  }

  // Array-level errors (min 1 row) live on `.root` (rules) or on the array itself (resolver).
  const variantsError =
    errors.variants?.root?.message ?? errors.variants?.message

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="mx-auto flex max-w-3xl flex-col gap-3 p-4"
    >
      <h1 className="text-xl font-medium">New product</h1>

      <FormField label="Title" error={errors.title?.message}>
        {(c) => (
          <input className="rounded border p-1" {...c} {...register("title")} />
        )}
      </FormField>
      <FormField label="Brand" error={errors.brand?.message}>
        {(c) => (
          <input className="rounded border p-1" {...c} {...register("brand")} />
        )}
      </FormField>

      <FormField label="Category" error={errors.category?.message}>
        {(c) => (
          <AsyncView
            state={categories}
            loading={<p role="status">Loading categories...</p>}
          >
            {(tree) => (
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select
                    name={field.name}
                    value={field.value || null}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      ref={field.ref}
                      onBlur={field.onBlur}
                      className="w-full"
                      {...c}
                    >
                      <SelectValue placeholder="Choose a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions(tree).map((o) => (
                        <SelectItem key={o.slug} value={o.slug}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </AsyncView>
        )}
      </FormField>

      <FormField label="Description" error={errors.description?.message}>
        {(c) => (
          <textarea
            rows={4}
            className="rounded border p-1"
            {...c}
            {...register("description")}
          />
        )}
      </FormField>

      <Controller
        control={control}
        name="images"
        render={({ field, fieldState }) => (
          <ImageDropzone
            label="Images"
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message ?? errors.images?.root?.message}
          />
        )}
      />

      <fieldset className="flex flex-col gap-2 rounded border p-2">
        <legend className="px-1 text-sm font-medium">Variants</legend>
        {variantsError && (
          <p role="alert" className="text-xs text-red-700">
            {variantsError}
          </p>
        )}
        {variants.fields.map((field, index) => {
          const e = errors.variants?.[index]
          return (
            // key = field.id (stable), NEVER the index.
            <div
              key={field.id}
              role="group"
              aria-label={`Variant ${index + 1}`}
              className="grid grid-cols-2 gap-2 border-b pb-2 md:grid-cols-6"
            >
              <FormField label="SKU" error={e?.sku?.message}>
                {(c) => (
                  <input
                    className="rounded border p-1"
                    {...c}
                    {...register(`variants.${index}.sku`)}
                  />
                )}
              </FormField>
              <FormField label="Color" error={e?.color?.message}>
                {(c) => (
                  <input
                    className="rounded border p-1"
                    {...c}
                    {...register(`variants.${index}.color`)}
                  />
                )}
              </FormField>
              <FormField label="Size" error={e?.size?.message}>
                {(c) => (
                  <input
                    className="rounded border p-1"
                    {...c}
                    {...register(`variants.${index}.size`)}
                  />
                )}
              </FormField>
              <FormField label="Price (Rs)" error={e?.price?.message}>
                {(c) => (
                  <input
                    inputMode="decimal"
                    className="rounded border p-1"
                    {...c}
                    {...register(`variants.${index}.price`)}
                  />
                )}
              </FormField>
              <FormField label="MRP (Rs)" error={e?.mrp?.message}>
                {(c) => (
                  <input
                    inputMode="decimal"
                    className="rounded border p-1"
                    {...c}
                    {...register(`variants.${index}.mrp`)}
                  />
                )}
              </FormField>
              <FormField label="Stock" error={e?.stock?.message}>
                {(c) => (
                  <input
                    inputMode="numeric"
                    className="rounded border p-1"
                    {...c}
                    {...register(`variants.${index}.stock`)}
                  />
                )}
              </FormField>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="col-span-2 self-start md:col-span-6"
                onClick={() => variants.remove(index)}
              >
                Remove variant {index + 1}
              </Button>
            </div>
          )
        })}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => variants.append(EMPTY_VARIANT)}
        >
          Add variant
        </Button>
      </fieldset>

      <fieldset className="flex flex-col gap-2 rounded border p-2">
        <legend className="px-1 text-sm font-medium">Specifications</legend>
        {specs.fields.map((field, index) => {
          const e = errors.specs?.[index]
          return (
            <div
              key={field.id}
              role="group"
              aria-label={`Specification ${index + 1}`}
              className="grid grid-cols-[1fr_1fr_auto] items-start gap-2"
            >
              <FormField label="Name" error={e?.name?.message}>
                {(c) => (
                  <input
                    className="rounded border p-1"
                    {...c}
                    {...register(`specs.${index}.name`)}
                  />
                )}
              </FormField>
              <FormField label="Value" error={e?.value?.message}>
                {(c) => (
                  <input
                    className="rounded border p-1"
                    {...c}
                    {...register(`specs.${index}.value`)}
                  />
                )}
              </FormField>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-6"
                onClick={() => specs.remove(index)}
              >
                Remove
                <span className="sr-only"> specification {index + 1}</span>
              </Button>
            </div>
          )
        })}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => specs.append({ name: "", value: "" })}
        >
          Add specification
        </Button>
      </fieldset>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          Create product (prints payload)
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            reset(DEFAULTS)
            setPayload(undefined)
          }}
        >
          Reset
        </Button>
      </div>

      {payload && (
        <section aria-label="Typed payload">
          <h2 className="text-sm font-medium">
            Payload (no endpoint until the seller API exists)
          </h2>
          <pre
            data-testid="payload"
            className="overflow-auto rounded bg-neutral-100 p-2 text-xs"
          >
            {/* A File serialises to {}: show what matters about each one. */}
            {JSON.stringify(
              {
                ...payload,
                images: payload.images.map((f) => ({
                  name: f.name,
                  type: f.type,
                  size: f.size,
                })),
              },
              null,
              2
            )}
          </pre>
        </section>
      )}
    </form>
  )
}
