import { useId, useRef, useState } from "react"

import { Button } from "@/components/ui/button"

const MAX_CHARS = 500
const STAR_LABELS = ["Terrible", "Poor", "Okay", "Good", "Excellent"]

export type ReviewPayload = { rating: number; text: string }

/**
 * Hand-rolled controlled form (React Hook Form replaces this in Stage 7):
 * every field is `value` + `onChange`, state is the single source of truth.
 */
export function ReviewForm({
  onSubmit = (payload) => console.log("review payload", payload),
}: {
  onSubmit?: (payload: ReviewPayload) => void
}) {
  const id = useId()
  const [rating, setRating] = useState(0)
  const [text, setText] = useState("")
  const [errors, setErrors] = useState<{ rating?: string; text?: string }>({})
  const firstStarRef = useRef<HTMLInputElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: typeof errors = {}
    if (rating === 0) next.rating = "Choose a star rating"
    if (text.trim() === "") next.text = "Write a few words about the product"
    setErrors(next)
    if (next.rating) return firstStarRef.current?.focus()
    if (next.text) return textRef.current?.focus()
    onSubmit({ rating, text: text.trim() })
    setRating(0)
    setText("")
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      <fieldset
        aria-describedby={errors.rating ? `${id}-rating-error` : undefined}
      >
        <legend className="text-sm font-medium">Your rating</legend>
        {/* Native radio group: arrow keys move and select, labels are real <label>s. */}
        <div className="flex gap-2">
          {STAR_LABELS.map((label, i) => {
            const value = i + 1
            return (
              <span key={value}>
                <input
                  ref={i === 0 ? firstStarRef : undefined}
                  id={`${id}-star-${value}`}
                  type="radio"
                  name={`${id}-rating`}
                  value={value}
                  checked={rating === value}
                  onChange={() => setRating(value)}
                  className="peer sr-only"
                />
                <label
                  htmlFor={`${id}-star-${value}`}
                  title={label}
                  className="cursor-pointer text-2xl peer-focus-visible:ring-2"
                >
                  <span className="sr-only">
                    {value} star{value > 1 ? "s" : ""}: {label}
                  </span>
                  <span aria-hidden>{value <= rating ? "★" : "☆"}</span>
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
            {errors.rating}
          </p>
        )}
      </fieldset>

      <div>
        <label htmlFor={`${id}-text`} className="text-sm font-medium">
          Your review
        </label>
        <textarea
          ref={textRef}
          id={`${id}-text`}
          value={text}
          maxLength={MAX_CHARS}
          rows={4}
          aria-invalid={errors.text ? true : undefined}
          aria-describedby={`${id}-count${errors.text ? ` ${id}-text-error` : ""}`}
          onChange={(e) => setText(e.target.value)}
          className="block w-full rounded border p-2 text-sm"
        />
        <p id={`${id}-count`} className="text-xs text-neutral-500">
          {text.length} / {MAX_CHARS}
        </p>
        {errors.text && (
          <p
            id={`${id}-text-error`}
            role="alert"
            className="text-sm text-red-700"
          >
            {errors.text}
          </p>
        )}
      </div>
      <Button type="submit" className="self-start">
        Submit review
      </Button>
    </form>
  )
}
