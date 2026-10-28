import { assertNever } from "@/lib/assert"

/**
 * Stepper bookkeeping as a reducer (8.1). Why `useReducer` and not three `useState`s: the
 * three pieces move together (going to a step marks it visited; completing one may need to
 * un-complete the later ones), and a reducer puts every legal transition in ONE pure
 * function that can be tested without React.
 *
 * Steps are indexes into `CHECKOUT_STEPS`. Arrays instead of `Set`s: plain data compares
 * and serialises easily, and four steps never need a Set's speed.
 */
export type StepperState = {
  /** The step on screen (a mirror of the URL; see CheckoutShell). */
  step: number
  /** Steps the user has opened, ascending, no duplicates. */
  visited: readonly number[]
  /** Steps whose own fields validated on "Continue", ascending, no duplicates. */
  completed: readonly number[]
}

export type StepperAction =
  | { type: "go"; step: number }
  | { type: "complete"; step: number }
  /** The user changed an answer on `step`: it and every LATER step must be confirmed again. */
  | { type: "invalidate"; step: number }
  | { type: "reset" }

export const initialStepperState: StepperState = {
  step: 0,
  visited: [0],
  completed: [],
}

const addSorted = (list: readonly number[], n: number) =>
  list.includes(n) ? list : [...list, n].sort((a, b) => a - b)

export function stepperReducer(
  state: StepperState,
  action: StepperAction
): StepperState {
  switch (action.type) {
    case "go":
      // Same step again: return the SAME object so React bails out of the re-render.
      if (action.step < 0) return state
      if (action.step === state.step && state.visited.includes(action.step))
        return state
      return {
        ...state,
        step: action.step,
        visited: addSorted(state.visited, action.step),
      }
    case "complete":
      return state.completed.includes(action.step)
        ? state
        : { ...state, completed: addSorted(state.completed, action.step) }
    case "invalidate": {
      const completed = state.completed.filter((s) => s < action.step)
      return completed.length === state.completed.length
        ? state
        : { ...state, completed }
    }
    case "reset":
      return initialStepperState
    default:
      // A new action type that is not handled above fails to COMPILE here.
      return assertNever(action)
  }
}
