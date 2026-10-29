import { api } from "@/lib/api/client"

export type Check = {
  name: string
  status: "ok" | "down" | "disabled"
  detail: string
  latencyMs?: number
}
export type Health = {
  status: "ok" | "degraded"
  checkedAt: string
  checks: Check[]
  process: {
    version: string
    node: string
    env: string
    uptimeSeconds: number
    rssMb: number
    heapUsedMb: number
    cpus: number
  }
  cache: { enabled: boolean; hits: number; misses: number }
}
export const getHealth = (signal?: AbortSignal) =>
  api<Health>("/admin/system/health", { signal })

export type Settings = {
  storeName: string
  supportEmail: string
  lowStockThreshold: number
  announcement: string
}
export type SettingsResponse = {
  editable: Settings
  readOnly: Record<string, string | number | boolean | string[]>
}
export const getSettings = (signal?: AbortSignal) =>
  api<SettingsResponse>("/admin/system/settings", { signal })
export const updateSettings = (body: Partial<Settings>) =>
  api<Settings>("/admin/system/settings", { method: "PATCH", body })

export type Vital = { name: string; path: string; samples: number; p75: number }
export const getVitals = (signal?: AbortSignal) =>
  api<Vital[]>("/admin/metrics/vitals", { signal })
