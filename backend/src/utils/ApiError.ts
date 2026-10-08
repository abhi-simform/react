// An error we throw ON PURPOSE for the client to see. Anything else is a bug (500).
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message)
    this.name = "ApiError"
  }

  static badRequest(message = "Bad request", details?: unknown) {
    return new ApiError(400, "BAD_REQUEST", message, details)
  }
  static unauthorized(message = "Authentication required", code = "UNAUTHORIZED") {
    return new ApiError(401, code, message)
  }
  static forbidden(message = "You do not have permission to do that") {
    return new ApiError(403, "FORBIDDEN", message)
  }
  static notFound(message = "Resource not found") {
    return new ApiError(404, "NOT_FOUND", message)
  }
  static conflict(message = "Conflict", code = "CONFLICT") {
    return new ApiError(409, code, message)
  }
}
