import { apiGet, apiPost, apiPut } from "./client"
import {
  mockSalesSummary,
  mockTimeseries,
  mockProducts,
  mockBestsellers,
  mockProductSummary,
  mockPlatforms,
  mockShippingCosts,
  mockShippingDelays,
  mockShippingCostTimeseries,
  mockShippingDelayTimeseries,
} from "../mock"
import type {
  SalesSummary,
  TimeseriesPoint,
  Product,
  Bestseller,
  ProductSummary,
  Platform,
  ShippingCost,
  ShippingDelay,
  ShippingCostTimeseries,
  ShippingDelayTimeseries,
  DashboardState,
} from "../types"

const USE_MOCK = !process.env.NEXT_PUBLIC_API_BASE_URL
const CACHE_5M = 5 * 60 * 1000

async function withFallback<T>(fetcher: () => Promise<T>, fallback: T): Promise<T> {
  if (USE_MOCK) return fallback
  try {
    return await fetcher()
  } catch {
    return fallback
  }
}

// Sales
export function getSalesSummary(): Promise<SalesSummary[]> {
  return withFallback(() => apiGet<SalesSummary[]>("/sales/summary"), mockSalesSummary)
}

export function getTimeseries(from: string, to: string): Promise<TimeseriesPoint[]> {
  return withFallback(
    () => apiGet<TimeseriesPoint[]>(`/sales/timeseries?from=${from}&to=${to}`),
    mockTimeseries.filter((p) => p.date >= from && p.date <= to)
  )
}

// Products
export function getProducts(): Promise<Product[]> {
  return withFallback(() => apiGet<Product[]>("/products", { cacheTtl: CACHE_5M }), mockProducts)
}

export function getBestsellers(): Promise<Bestseller[]> {
  return withFallback(() => apiGet<Bestseller[]>("/products/bestseller"), mockBestsellers)
}

export function getProductById(id: number): Promise<Product> {
  return withFallback(
    () => apiGet<Product>(`/product/${id}`),
    mockProducts.find((p) => p.product_id === id) || mockProducts[0]
  )
}

export function getProductSummary(id: number): Promise<ProductSummary> {
  return withFallback(
    () => apiGet<ProductSummary>(`/product/${id}/summary`),
    { ...mockProductSummary, product_id: id }
  )
}

export function updateProduct(id: number, data: Partial<Product>): Promise<Product> {
  return apiPut<Product>(`/product/${id}`, data)
}

// Platforms
export function getPlatforms(): Promise<Platform[]> {
  return withFallback(() => apiGet<Platform[]>("/platforms", { cacheTtl: CACHE_5M }), mockPlatforms)
}

// Shipping
export function getShippingCosts(): Promise<ShippingCost[]> {
  return withFallback(
    () => apiGet<ShippingCost[]>("/shipping/delays?type=cost"),
    mockShippingCosts
  )
}

export function getShippingDelays(): Promise<ShippingDelay[]> {
  return withFallback(
    () => apiGet<ShippingDelay[]>("/shipping/delays?type=delays"),
    mockShippingDelays
  )
}

export function getShippingCostTimeseries(from: string, to: string): Promise<ShippingCostTimeseries[]> {
  return withFallback(
    () => apiGet<ShippingCostTimeseries[]>(`/shipping/delays?type=cost_timeseries&from=${from}&to=${to}`),
    mockShippingCostTimeseries
  )
}

export function getShippingDelayTimeseries(from: string, to: string): Promise<ShippingDelayTimeseries[]> {
  return withFallback(
    () => apiGet<ShippingDelayTimeseries[]>(`/shipping/delays?type=delays_timeseries&from=${from}&to=${to}`),
    mockShippingDelayTimeseries
  )
}

// Dashboard persistence (remote)
export function loadDashboardRemote(userId: string): Promise<DashboardState | null> {
  return apiGet<DashboardState | null>(`/dashboard/${userId}`)
}

export function saveDashboardRemote(userId: string, state: DashboardState): Promise<void> {
  return apiPost(`/dashboard/${userId}`, state)
}
