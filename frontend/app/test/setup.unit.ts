import "@testing-library/jest-dom/vitest"

import { afterEach } from "vitest"

// Pure-logic tests: no MSW, no fixture database. A test here that fires a request fails with a
// real (refused) connection, and belongs in the "dom" project.
afterEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})
