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
} from "./types"

export const mockPlatforms: Platform[] = [
  { platform_id: 1, name: "Amazon" },
  { platform_id: 2, name: "Shopify" },
  { platform_id: 3, name: "eBay" },
  { platform_id: 4, name: "Etsy" },
]

export const mockSalesSummary: SalesSummary[] = [
  { platform: "Amazon", total_sales_count: 4521, total_revenue: 287450, total_profit: 89120 },
  { platform: "Shopify", total_sales_count: 2834, total_revenue: 198760, total_profit: 72340 },
  { platform: "eBay", total_sales_count: 1567, total_revenue: 95420, total_profit: 31200 },
  { platform: "Etsy", total_sales_count: 892, total_revenue: 67890, total_profit: 28450 },
]

function generateTimeseries(days: number): TimeseriesPoint[] {
  const data: TimeseriesPoint[] = []
  const now = new Date()
  for (let i = days; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const base = 800 + Math.sin(i * 0.3) * 200 + Math.random() * 150
    data.push({
      date: d.toISOString().slice(0, 10),
      total_quantity: Math.round(base * 0.8),
      total_revenue: Math.round(base * 45 + Math.random() * 5000),
      total_profit: Math.round(base * 15 + Math.random() * 2000),
    })
  }
  return data
}

export const mockTimeseries: TimeseriesPoint[] = generateTimeseries(90)

export const mockProducts: Product[] = [
  { product_id: 1, sku: "WDG-001", name: "Premium Widget Pro", ref_cost: 12.5 },
  { product_id: 2, sku: "WDG-002", name: "Widget Standard", ref_cost: 8.0 },
  { product_id: 3, sku: "GDG-001", name: "Gadget Deluxe", ref_cost: 25.0 },
  { product_id: 4, sku: "GDG-002", name: "Gadget Mini", ref_cost: 15.0 },
  { product_id: 5, sku: "ACC-001", name: "Accessory Pack A", ref_cost: 5.5 },
  { product_id: 6, sku: "ACC-002", name: "Accessory Pack B", ref_cost: 7.0 },
  { product_id: 7, sku: "BND-001", name: "Bundle Starter Kit", ref_cost: 35.0 },
  { product_id: 8, sku: "BND-002", name: "Bundle Pro Kit", ref_cost: 55.0 },
  { product_id: 9, sku: "SPR-001", name: "Spare Part Alpha", ref_cost: 3.0 },
  { product_id: 10, sku: "SPR-002", name: "Spare Part Beta", ref_cost: 4.5 },
]

export const mockBestsellers: Bestseller[] = [
  { name: "Premium Widget Pro", total_quantity: 3200, total_revenue: 128000, total_profit: 48000 },
  { name: "Gadget Deluxe", total_quantity: 2100, total_revenue: 157500, total_profit: 52500 },
  { name: "Widget Standard", total_quantity: 2800, total_revenue: 84000, total_profit: 28000 },
  { name: "Bundle Pro Kit", total_quantity: 850, total_revenue: 93500, total_profit: 38500 },
  { name: "Gadget Mini", total_quantity: 1900, total_revenue: 66500, total_profit: 28500 },
  { name: "Accessory Pack A", total_quantity: 4200, total_revenue: 46200, total_profit: 23100 },
  { name: "Bundle Starter Kit", total_quantity: 1100, total_revenue: 77000, total_profit: 27500 },
  { name: "Accessory Pack B", total_quantity: 3100, total_revenue: 43400, total_profit: 18600 },
]

export const mockProductSummary: ProductSummary = {
  product_id: 1,
  name: "Premium Widget Pro",
  sku: "WDG-001",
  total_sales: 3200,
  total_quantity: 3200,
  avg_price: 40.0,
  total_revenue: 128000,
}

export const mockShippingCosts: ShippingCost[] = [
  { supplier_name: "DHL Express", total_shipping_cost: 45200 },
  { supplier_name: "FedEx", total_shipping_cost: 38900 },
  { supplier_name: "UPS", total_shipping_cost: 42100 },
  { supplier_name: "USPS", total_shipping_cost: 21300 },
  { supplier_name: "Hermes", total_shipping_cost: 15800 },
]

export const mockShippingDelays: ShippingDelay[] = [
  { supplier_name: "DHL Express", average_delivery_time_days: 2.3 },
  { supplier_name: "FedEx", average_delivery_time_days: 2.8 },
  { supplier_name: "UPS", average_delivery_time_days: 3.1 },
  { supplier_name: "USPS", average_delivery_time_days: 4.5 },
  { supplier_name: "Hermes", average_delivery_time_days: 5.2 },
]

function generateShippingTimeseries(days: number) {
  const costs: ShippingCostTimeseries[] = []
  const delays: ShippingDelayTimeseries[] = []
  const now = new Date()
  for (let i = days; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    costs.push({
      order_date: dateStr,
      daily_shipping_cost: Math.round(500 + Math.random() * 300 + Math.sin(i * 0.2) * 100),
    })
    delays.push({
      order_date: dateStr,
      average_daily_delivery_time_days: +(2.5 + Math.random() * 2 + Math.sin(i * 0.15) * 0.5).toFixed(1),
    })
  }
  return { costs, delays }
}

const shippingTs = generateShippingTimeseries(60)
export const mockShippingCostTimeseries = shippingTs.costs
export const mockShippingDelayTimeseries = shippingTs.delays
