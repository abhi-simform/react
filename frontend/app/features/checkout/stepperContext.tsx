import { createContext, useContext, useReducer } from "react"

import {
  initialStepperState,
  stepperReducer,
  type StepperAction,
  type StepperState,
} from "./stepperReducer"

/**
 * Two contexts on purpose (8.2's lesson applied early): the STATE changes on every step
 * change, the DISPATCH function never does. A component that only dispatches (StepNav's
 * "Continue") subscribes to the dispatch context and is not re-rendered by state changes.
 */
const StateContext = createContext<StepperState | null>(null)
const DispatchContext = createContext<React.Dispatch<StepperAction> | null>(
  null
)

export function StepperProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(stepperReducer, initialStepperState)
  return (
    <DispatchContext value={dispatch}>
      <StateContext value={state}>{children}</StateContext>
    </DispatchContext>
  )
}

export function useStepper(): StepperState {
  const value = useContext(StateContext)
  if (!value)
    throw new Error("useStepper must be used inside <StepperProvider>")
  return value
}

export function useStepperDispatch(): React.Dispatch<StepperAction> {
  const value = useContext(DispatchContext)
  if (!value)
    throw new Error("useStepperDispatch must be used inside <StepperProvider>")
  return value
}
