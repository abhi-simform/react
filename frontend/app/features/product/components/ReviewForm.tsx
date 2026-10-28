import { useId } from "react"
import { useForm, useWatch, type Control } from "react-hook-form"

import { Button } from "@/components/ui/button"

const MAX_CHARS = 500
const MIN_CHARS = 20
const STAR_LABELS = ["Terrible", "Poor", "Okay", "Good", "Excellent"]

export type ReviewPayload = { rating: number; text: string }

/** What the inputs hold: a radio group gives a STRING ("4"), converted on submit. */
type ReviewFields = { rating: string; text: string }

/**
 * 7.1: React Hook Form with the BUILT-IN rules (no resolver yet; 7.2 moves the rules into
 * a Zod schema). Inputs are uncontrolled: `register` hands each one a ref + handlers, so
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
  } = useForm<ReviewFields>({
    defaultValues: { rating: "", text: "" },
    mode: "onSubmit", // first validation on submit, then on every change (reValidateMode)
  })

  async function submit(values: ReviewFields) {
    await onSubmit({ rating: Number(values.rating), text: values.text.trim() })
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
                  {...register("rating", { required: "Choose a star rating" })}
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

      <div>
        <label htmlFor={`${id}-text`} className="text-sm font-medium">
          Your review
        </label>
        <textarea
          id={`${id}-text`}
          rows={4}
          aria-invalid={errors.text ? true : undefined}
          aria-describedby={`${id}-count${errors.text ? ` ${id}-text-error` : ""}`}
          {...register("text", {
            required: "Write a few words about the product",
            minLength: {
              value: MIN_CHARS,
              message: `Write at least ${MIN_CHARS} characters`,
            },
            maxLength: {
              value: MAX_CHARS,
              message: `At most ${MAX_CHARS} characters`,
            },
          })}
          className="block w-full rounded border p-2 text-sm"
        />
        <CharCount id={`${id}-count`} control={control} />
        {errors.text && (
          <p
            id={`${id}-text-error`}
            role="alert"
            className="text-sm text-red-700"
          >
            {errors.text.message}
          </p>
        )}
      </div>
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
  id,
  control,
}: {
  id: string
  control: Control<ReviewFields>
}) {
  const text = useWatch({ control, name: "text" })
  return (
    <p id={id} className="text-xs text-neutral-500">
      {text.length} / {MAX_CHARS}
    </p>
  )
}
