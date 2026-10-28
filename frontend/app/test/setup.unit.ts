import { afterEach } from "vitest"

// Pure-logic tests run in Node (no jsdom: that is most of a file's start-up cost). A test that
// needs `window`/`localStorage`/`File` starts with `// @vitest-environment jsdom`. No MSW and no
// fixture database here: a test that fires a request belongs in the "dom" project.
afterEach(() => {
  globalThis.localStorage?.clear()
  globalThis.sessionStorage?.clear()
})
