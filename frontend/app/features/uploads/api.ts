import { apiUpload } from "@/lib/api/upload"

import { uploadedImageSchema, type UploadedImage } from "./schemas"

/**
 * Upload one image to `POST /uploads/images` (field `file`, XHR for progress).
 * Resolves with the stored image (`url` is absolute and public). Cancel with `signal`.
 * If the endpoint did not exist yet, a `setTimeout` simulation with this exact signature
 * would be swapped for this function without touching any UI (the plan's advice).
 */
export function uploadImage(
  file: File,
  {
    onProgress,
    signal,
  }: { onProgress?: (fraction: number) => void; signal?: AbortSignal } = {}
): Promise<UploadedImage> {
  const form = new FormData()
  form.append("file", file) // the field name the backend expects
  return apiUpload("/uploads/images", form, {
    onProgress,
    signal,
    schema: uploadedImageSchema,
  })
}
