import { QueryErrorResetBoundary } from "@tanstack/react-query"
import { Component, type ReactNode } from "react"

import { Button } from "@/components/ui/button"

type Props = { children: ReactNode; label: string; onReset?: () => void }
type State = { error: Error | null }

class Boundary extends Component<Props, State> {
  state: State = { error: null }
  static getDerivedStateFromError(error: Error): State {
    return { error }
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" className="rounded border border-red-300 p-3 text-sm">
        <p>Could not load {this.props.label}.</p>
        <Button
          size="sm"
          variant="outline"
          className="mt-2"
          onClick={() => {
            this.props.onReset?.()
            this.setState({ error: null })
          }}
        >
          Try again
        </Button>
      </div>
    )
  }
}

/**
 * Error boundary for `useSuspenseQuery` sections (9.9). A suspense query THROWS its error
 * during render, so a boundary has to catch it; `QueryErrorResetBoundary` lets "Try again"
 * reset the failed queries first, otherwise the retry would instantly re-throw the cached error.
 */
export function RailErrorBoundary({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <Boundary label={label} onReset={reset}>
          {children}
        </Boundary>
      )}
    </QueryErrorResetBoundary>
  )
}
