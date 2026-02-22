// ── API Response Types ──

export interface SalesSummary {
  platform: string
  total_sales_count: number
  total_revenue: number
  total_profit: number
}

export interface TimeseriesPoint {
  date: string
  total_quantity: number
  total_revenue: number
  total_profit: number
}

export interface Product {
  product_id: number
  sku: string
  name: string
  ref_cost: number
}

export interface Bestseller {
  name: string
  total_quantity: number
  total_revenue: number
  total_profit: number
}

export interface ProductSummary {
  product_id: number
  name: string
  sku: string
  total_sales: number
  total_quantity: number
  avg_price: number
  total_revenue: number
}

export interface Platform {
  platform_id: number
  name: string
}

export interface ShippingCost {
  supplier_name: string
  total_shipping_cost: number
}

export interface ShippingDelay {
  supplier_name: string
  average_delivery_time_days: number
}

export interface ShippingCostTimeseries {
  order_date: string
  daily_shipping_cost: number
}

export interface ShippingDelayTimeseries {
  order_date: string
  average_daily_delivery_time_days: number
}

// ── Chart Builder Types ──

export type ChartType = "line" | "bar" | "pie" | "doughnut" | "scatter"

export type DatasetId =
  | "SalesTimeseries"
  | "SalesSummary"
  | "Bestsellers"
  | "ShippingCost"
  | "ShippingDelays"
  | "ShippingCostTimeseries"
  | "ShippingDelaysTimeseries"
  | "Products"
  | "ProductSummary"

export interface ChartDefinition {
  id: string
  name: string
  description: string
  tags: string[]
  datasetId: DatasetId
  chartType: ChartType
  xField: string
  yFields: string[]
  aggregation?: string
  filters: {
    from?: string
    to?: string
    platformIds?: number[]
    productIds?: number[]
    supplier?: string
  }
  options: {
    stacked?: boolean
    showLegend?: boolean
    colorScheme?: string
  }
  createdAt: string
  updatedAt: string
}

export interface DatasetDefinition {
  id: DatasetId
  label: string
  fields: { key: string; label: string; type: "string" | "number" | "date" }[]
  endpoint: string
  category: string
}

// ── Dashboard Persistence Types ──

export interface DashboardState {
  userId: string
  charts: string[] // chart definition IDs
  layout: DashboardLayoutItem[]
  updatedAt: string
}

export interface DashboardLayoutItem {
  chartId: string
  x: number
  y: number
  w: number
  h: number
}

export interface DashboardMeta {
  userId: string
  updatedAt: string
  chartCount: number
}

// ── Auth Types ──

export interface AuthUser {
  id: string
  email: string
  name: string
  avatar?: string
}

export interface AuthState {
  isAuthenticated: boolean
  user: AuthUser | null
  token: string | null
}

// ── Filter Types ──

export interface FilterState {
  dateFrom: string
  dateTo: string
  platformIds: number[]
  productIds: number[]
}
