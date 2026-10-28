/** Requests no handler matched. setup.ts fails the test that made one, unless the test took it. */
const unhandled: string[] = []
export const recordUnhandled = (line: string) => void unhandled.push(line)
/** Returns (and forgets) the unmocked requests so far: for the test OF the safety net. */
export const takeUnhandled = () => unhandled.splice(0)
