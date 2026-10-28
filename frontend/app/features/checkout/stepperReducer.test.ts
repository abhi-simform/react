import { describe, expect, it } from "vitest"

import {
  initialStepperState,
  stepperReducer,
  type StepperAction,
  type StepperState,
} from "./stepperReducer"

const run = (
  actions: StepperAction[],
  from: StepperState = initialStepperState
) => actions.reduce(stepperReducer, from)

describe("stepperReducer", () => {
  it("go marks the step visited, sorted and without duplicates", () => {
    const s = run([
      { type: "go", step: 2 },
      { type: "go", step: 1 },
      { type: "go", step: 2 },
    ])
    expect(s).toEqual({ step: 2, visited: [0, 1, 2], completed: [] })
  })
  it("going to the current step returns the SAME object (no re-render)", () => {
    expect(stepperReducer(initialStepperState, { type: "go", step: 0 })).toBe(
      initialStepperState
    )
  })
  it("a negative step is ignored", () => {
    expect(stepperReducer(initialStepperState, { type: "go", step: -1 })).toBe(
      initialStepperState
    )
  })
  it("complete is idempotent and sorted", () => {
    const s = run([
      { type: "complete", step: 1 },
      { type: "complete", step: 0 },
    ])
    expect(s.completed).toEqual([0, 1])
    expect(stepperReducer(s, { type: "complete", step: 0 })).toBe(s)
  })
  it("invalidate un-completes that step and every later one", () => {
    const s = run(
      [0, 1, 2].map((step) => ({ type: "complete", step }) as const)
    )
    expect(
      stepperReducer(s, { type: "invalidate", step: 1 }).completed
    ).toEqual([0])
  })
  it("invalidate with nothing to drop returns the same object", () => {
    const s = run([{ type: "complete", step: 0 }])
    expect(stepperReducer(s, { type: "invalidate", step: 3 })).toBe(s)
  })
  it("reset", () => {
    expect(run([{ type: "go", step: 3 }, { type: "reset" }])).toBe(
      initialStepperState
    )
  })
  it("never mutates the previous state", () => {
    const frozen = Object.freeze({
      step: 0,
      visited: Object.freeze([0]),
      completed: Object.freeze([0]),
    })
    expect(() =>
      run(
        [
          { type: "go", step: 1 },
          { type: "complete", step: 1 },
          { type: "invalidate", step: 0 },
        ],
        frozen
      )
    ).not.toThrow()
  })
})
