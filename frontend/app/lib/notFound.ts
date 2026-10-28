/** Throw this from render when a looked-up thing does not exist; the nearest ErrorBoundary shows the 404. */
export class NotFoundError extends Error {
  readonly what: string
  constructor(what: string, id?: string) {
    super(id ? `${what} "${id}" was not found` : `${what} was not found`)
    this.name = "NotFoundError"
    this.what = what
  }
}
