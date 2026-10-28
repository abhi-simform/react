// 7.1 lab: re-renders per keystroke, plain controlled form vs React Hook Form.
// Each field sits in a <Profiler>: its `onRender` fires every time anything inside
// that subtree re-renders, so the count per field = renders caused by typing elsewhere.
// Both forms are memo()ed: pressing "Read counts" re-renders the lab, not the forms.
import { memo, Profiler, useState } from "react"
import { useForm, useWatch, type Control } from "react-hook-form"

type Counts = Record<string, number>
/** A mutable bag outside React state: Profiler callbacks write to it, nothing re-renders. */
const bag: { counts: Counts } = { counts: {} }
type Fields = { name: string; email: string; bio: string }
const LABELS = ["name", "email", "bio"] as const

type Mode = "none" | "useWatch" | "watch"

function Counted({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <Profiler
      id={id}
      onRender={() => {
        bag.counts[id] = (bag.counts[id] ?? 0) + 1
      }}
    >
      {children}
    </Profiler>
  )
}

const PlainForm = memo(function PlainForm() {
  const [values, setValues] = useState<Fields>({ name: "", email: "", bio: "" })
  return (
    <form className="grid gap-1" onSubmit={(e) => e.preventDefault()}>
      {LABELS.map((key) => (
        <Counted key={key} id={`plain.${key}`}>
          <label className="text-sm">
            {key}{" "}
            <input
              className="border p-1"
              value={values[key]}
              onChange={(e) =>
                setValues((v) => ({ ...v, [key]: e.target.value }))
              }
            />
          </label>
        </Counted>
      ))}
    </form>
  )
})

function Echo({ control }: { control: Control<Fields> }) {
  const name = useWatch({ control, name: "name" })
  return <p className="text-xs">useWatch echo: {name}</p>
}

const RhfForm = memo(function RhfForm({ mode }: { mode: Mode }) {
  const { register, control, watch } = useForm<Fields>({
    defaultValues: { name: "", email: "", bio: "" },
  })
  // `watch("name")` at the ROOT subscribes the whole form component to that field.
  const rootWatched = mode === "watch" ? watch("name") : undefined
  return (
    <form className="grid gap-1" onSubmit={(e) => e.preventDefault()}>
      {LABELS.map((key) => (
        <Counted key={key} id={`rhf.${key}`}>
          <label className="text-sm">
            {key} <input className="border p-1" {...register(key)} />
          </label>
        </Counted>
      ))}
      {mode === "useWatch" && <Echo control={control} />}
      {mode === "watch" && (
        <p className="text-xs">root watch echo: {rootWatched}</p>
      )}
    </form>
  )
})

export function RenderCountLab() {
  const [snapshot, setSnapshot] = useState<Counts>({})
  const [mode, setMode] = useState<Mode>("none")
  const [epoch, setEpoch] = useState(0)

  return (
    <div className="grid gap-3 text-sm">
      <p>
        Type in the <b>name</b> field of each form, then press "Read counts".
        The <b>email</b> and <b>bio</b> counts show how often a SIBLING field
        re-rendered.
      </p>
      <label>
        RHF subscription:{" "}
        <select
          className="border p-1"
          value={mode}
          onChange={(e) => {
            setMode(e.target.value as Mode)
            bag.counts = {}
            setSnapshot({})
            setEpoch((n) => n + 1)
          }}
        >
          <option value="none">none</option>
          <option value="useWatch">useWatch in a child</option>
          <option value="watch">watch() at the root</option>
        </select>
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <section aria-label="Plain controlled form" className="border p-3">
          <h2 className="font-medium">Plain (useState per form)</h2>
          <PlainForm key={`p${epoch}`} />
        </section>
        <section aria-label="React Hook Form" className="border p-3">
          <h2 className="font-medium">React Hook Form</h2>
          <RhfForm key={`r${epoch}`} mode={mode} />
        </section>
      </div>
      <button
        type="button"
        className="self-start rounded border px-2 py-1"
        onClick={() => setSnapshot({ ...bag.counts })}
      >
        Read counts
      </button>
      <pre data-testid="counts" className="rounded bg-neutral-100 p-2 text-xs">
        {JSON.stringify(snapshot, null, 1)}
      </pre>
    </div>
  )
}
