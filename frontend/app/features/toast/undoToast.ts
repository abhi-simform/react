import { toast } from "sonner"

/**
 * A toast with an Undo button (8.5): the action already happened (instant feedback, no confirm
 * dialog), and Undo restores from a snapshot the CALLER captured before changing anything.
 * Every call creates its own toast with its own snapshot, so quick successive removals each
 * stay individually undoable. `duration` is generous: the toast IS the safety net.
 */
export function undoableToast(message: string, onUndo: () => void) {
  return toast(message, {
    duration: 8000,
    action: { label: "Undo", onClick: onUndo },
  })
}
