/** Only same-site paths: a `?redirect=https://evil.example` must never bounce the user away. */
export function safeRedirect(value: string | undefined): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.startsWith("/\\")
  )
    return "/"
  return value
}
