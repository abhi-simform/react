import { useId } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, useWatch, type Control } from "react-hook-form"

import { FormField } from "@/components/form/FormField"
import { Button } from "@/components/ui/button"
import { ImageDropzone } from "@/features/uploads"

import { reviewSchema, type ReviewInput, type ReviewOutput } from "../schemas"

const MAX_CHARS = 500
const STAR_LABELS = ["Terrible", "Poor", "Okay", "Good", "Excellent"]

/** Derived from the schema (7.2): no hand-written interface to drift. */
export type ReviewPayload = ReviewOutput

/**
 * 7.1 + 7.2: React Hook Form with the rules in a Zod schema (`../schemas.ts`, via
 * `zodResolver`). The radio group yields the string "4"; the schema coerces it, so
 * `useForm` takes the INPUT type and the OUTPUT type separately. Inputs are uncontrolled:
 * `register` hands each one a ref + handlers, so
 * typing does not re-render this component. Only what we SUBSCRIBE to re-renders:
 * `formState.errors` (read below) and `useWatch` inside `CharCount` (its own component).
 */
export function ReviewForm({
  onSubmit = (payload) => console.log("review payload", payload),
}: {
  onSubmit?: (payload: ReviewPayload) => void | Promise<void>
}) {
  const id = useId()
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReviewInput, unknown, ReviewOutput>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: "", text: "", photos: [] },
    mode: "onSubmit", // first validation on submit, then on every change (reValidateMode)
  })

  async function submit(values: ReviewOutput) {
    await onSubmit(values) // already a number and trimmed
    reset()
  }

  return (
    // RHF focuses the first invalid field itself (`shouldFocusError`, default true).
    <form
      onSubmit={handleSubmit(submit)}
      noValidate
      className="flex flex-col gap-3"
    >
      <fieldset
        aria-describedby={errors.rating ? `${id}-rating-error` : undefined}
      >
        <legend className="text-sm font-medium">Your rating</legend>
        <div className="flex gap-2">
          {STAR_LABELS.map((label, i) => {
            const value = i + 1
            return (
              <span key={value}>
                <input
                  id={`${id}-star-${value}`}
                  type="radio"
                  value={value}
                  {...register("rating")}
                  className="peer sr-only"
                />
                <label
                  htmlFor={`${id}-star-${value}`}
                  title={label}
                  className="cursor-pointer text-2xl peer-checked:text-amber-600 peer-focus-visible:ring-2"
                >
                  <span className="sr-only">
                    {value} star{value > 1 ? "s" : ""}: {label}
                  </span>
                  <span aria-hidden>★</span>
                </label>
              </span>
            )
          })}
        </div>
        {errors.rating && (
          <p
            id={`${id}-rating-error`}
            role="alert"
            className="text-sm text-red-700"
          >
            {errors.rating.message}
          </p>
        )}
      </fieldset>

      <FormField
        label="Your review"
        error={errors.text?.message}
        hint={<CharCount control={control} />}
      >
        {(field) => (
          <textarea
            rows={4}
            className="block w-full rounded border p-2 text-sm"
            {...field}
            {...register("text")}
          />
        )}
      </FormField>
      <Controller
        control={control}
        name="photos"
        render={({ field, fieldState }) => (
          // A drop zone is not a native input: Controller carries the File[] in and out.
          <ImageDropzone
            label="Photos (optional)"
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <Button type="submit" className="self-start" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Submit review"}
      </Button>
    </form>
  )
}

/**
 * `useWatch` re-renders ONLY this component when `text` changes. `watch("text")` in the
 * parent would re-render the whole form on every keystroke (see /dev/forms).
 */
function CharCount({
  control,
}: {
  control: Control<ReviewInput, unknown, ReviewOutput>
}) {
  const text = useWatch({ control, name: "text" })
  return (
    <>
      {text.length} / {MAX_CHARS}
    </>
  )
}
