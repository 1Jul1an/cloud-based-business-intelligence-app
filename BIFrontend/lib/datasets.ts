import type { DatasetDefinition } from "./types"

export const DATASETS: DatasetDefinition[] = [
  {
    id: "SalesTimeseries",
    label: "Sales Timeseries",
    category: "Sales",
    endpoint: "/sales/timeseries",
    fields: [
      { key: "date", label: "Date", type: "date" },
      { key: "total_quantity", label: "Quantity", type: "number" },
      { key: "total_revenue", label: "Revenue", type: "number" },
      { key: "total_profit", label: "Profit", type: "number" },
    ],
  },
  {
    id: "SalesSummary",
    label: "Sales Summary",
    category: "Sales",
    endpoint: "/sales/summary",
    fields: [
      { key: "platform", label: "Platform", type: "string" },
      { key: "total_sales_count", label: "Sales Count", type: "number" },
      { key: "total_revenue", label: "Revenue", type: "number" },
      { key: "total_profit", label: "Profit", type: "number" },
    ],
  },
  {
    id: "Bestsellers",
    label: "Bestsellers",
    category: "Products",
    endpoint: "/products/bestseller",
    fields: [
      { key: "name", label: "Product Name", type: "string" },
      { key: "total_quantity", label: "Quantity", type: "number" },
      { key: "total_revenue", label: "Revenue", type: "number" },
      { key: "total_profit", label: "Profit", type: "number" },
    ],
  },
  {
    id: "Products",
    label: "Products",
    category: "Products",
    endpoint: "/products",
    fields: [
      { key: "name", label: "Name", type: "string" },
      { key: "sku", label: "SKU", type: "string" },
      { key: "ref_cost", label: "Reference Cost", type: "number" },
    ],
  },
  {
    id: "ShippingCost",
    label: "Shipping Costs",
    category: "Shipping",
    endpoint: "/shipping/delays?type=cost",
    fields: [
      { key: "supplier_name", label: "Supplier", type: "string" },
      { key: "total_shipping_cost", label: "Shipping Cost", type: "number" },
    ],
  },
  {
    id: "ShippingDelays",
    label: "Shipping Delays",
    category: "Shipping",
    endpoint: "/shipping/delays?type=delays",
    fields: [
      { key: "supplier_name", label: "Supplier", type: "string" },
      { key: "average_delivery_time_days", label: "Avg Delivery Days", type: "number" },
    ],
  },
  {
    id: "ShippingCostTimeseries",
    label: "Shipping Cost Trend",
    category: "Shipping",
    endpoint: "/shipping/delays?type=cost_timeseries",
    fields: [
      { key: "order_date", label: "Date", type: "date" },
      { key: "daily_shipping_cost", label: "Daily Cost", type: "number" },
    ],
  },
  {
    id: "ShippingDelaysTimeseries",
    label: "Shipping Delay Trend",
    category: "Shipping",
    endpoint: "/shipping/delays?type=delays_timeseries",
    fields: [
      { key: "order_date", label: "Date", type: "date" },
      { key: "average_daily_delivery_time_days", label: "Avg Daily Delay", type: "number" },
    ],
  },
]
