import { api } from "@/lib/api/client"
import type { Banner, Coupon, Deal } from "./types"

export const listCoupons = () => api<Coupon[]>("/admin/coupons")
export const createCoupon = (body: object) =>
  api<Coupon>("/admin/coupons", { method: "POST", body })
export const updateCoupon = (id: string, body: object) =>
  api<Coupon>(`/admin/coupons/${id}`, { method: "PATCH", body })

export const listDeals = () => api<Deal[]>("/admin/deals")
export const createDeal = (body: object) =>
  api<Deal>("/admin/deals", { method: "POST", body })
export const updateDeal = (id: string, body: object) =>
  api<Deal>(`/admin/deals/${id}`, { method: "PATCH", body })
export const deleteDeal = (id: string) =>
  api(`/admin/deals/${id}`, { method: "DELETE" })

export const listBanners = () => api<Banner[]>("/admin/banners")
export const createBanner = (body: object) =>
  api<Banner>("/admin/banners", { method: "POST", body })
export const updateBanner = (id: string, body: object) =>
  api<Banner>(`/admin/banners/${id}`, { method: "PATCH", body })
export const deleteBanner = (id: string) =>
  api(`/admin/banners/${id}`, { method: "DELETE" })
