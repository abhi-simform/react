// 8.1: the checkout stepper reducer is pure, idempotent and keeps its lists sorted.
import assert from "node:assert/strict"
import { describe, it } from "vitest"

import {
  initialStepperState,
  stepperReducer,
  type StepperAction,
} from "@/features/checkout/stepperReducer"

describe("20-stepper-reducer", () => {
  it("holds every assertion of the Stage 1-11 scratch check", async () => {
    const run = (...actions: StepperAction[]) =>
      actions.reduce(stepperReducer, initialStepperState)

    // going forward marks visited (sorted, no duplicates)
    assert.deepEqual(run({ type: "go", step: 2 }, { type: "go", step: 1 }), {
      step: 1,
      visited: [0, 1, 2],
      completed: [],
    })

    // repeating an action returns the SAME object (React skips the re-render)
    const once = run({ type: "go", step: 1 }, { type: "complete", step: 0 })
    assert.equal(stepperReducer(once, { type: "complete", step: 0 }), once)
    assert.equal(stepperReducer(once, { type: "go", step: 1 }), once)

    // editing step 1 un-completes step 1 and later, but keeps step 0
    const done = run(
      { type: "complete", step: 0 },
      { type: "complete", step: 1 },
      { type: "complete", step: 2 },
      { type: "invalidate", step: 1 }
    )
    assert.deepEqual(done.completed, [0])

    // purity: the input state is never mutated
    const frozen = Object.freeze({
      step: 0,
      visited: Object.freeze([0]),
      completed: Object.freeze([]),
    })
    stepperReducer(frozen, { type: "go", step: 3 })
    stepperReducer(frozen, { type: "complete", step: 3 })

    // an unknown action fails loudly at runtime (and at compile time via assertNever)
    assert.throws(() =>
      stepperReducer(initialStepperState, { type: "nope" } as never)
    )
    assert.deepEqual(
      run({ type: "go", step: 3 }, { type: "reset" }),
      initialStepperState
    )
  })
})
