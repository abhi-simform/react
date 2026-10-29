// Copied from /frontend (no shared code). Only VITE_ variables reach the browser bundle.
const apiUrl = import.meta.env.VITE_API_URL
if (!apiUrl)
  throw new Error("VITE_API_URL is missing: copy .env.example to .env.local")

export const env = {
  API_URL: apiUrl.replace(/\/$/, ""),
  DEV: import.meta.env.DEV,
}
