/** Whether `url` is one of THIS user's uploads (`/uploads/<userId>-<uuid>.<ext>`, see POST /uploads/images). */
export function isOwnUpload(url: string, userId: string) {
  try {
    const u = new URL(url)
    return new RegExp(
      `^/uploads/${userId}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(jpg|png|webp)$`
    ).test(u.pathname)
  } catch {
    return false
  }
}
