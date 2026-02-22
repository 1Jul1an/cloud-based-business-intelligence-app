import type { DatasetId } from "@/lib/types"
import {
  getSalesSummary,
  getTimeseries,
  getBestsellers,
  getProducts,
  getShippingCosts,
  getShippingDelays,
  getShippingCostTimeseries,
  getShippingDelayTimeseries,
} from "@/lib/api/endpoints"

export async function fetchDatasetData(
  datasetId: DatasetId,
  dateFrom: string,
  dateTo: string
): Promise<Record<string, unknown>[]> {
  switch (datasetId) {
    case "SalesTimeseries":
      return (await getTimeseries(dateFrom, dateTo)) as unknown as Record<string, unknown>[]
    case "SalesSummary":
      return (await getSalesSummary()) as unknown as Record<string, unknown>[]
    case "Bestsellers":
      return (await getBestsellers()) as unknown as Record<string, unknown>[]
    case "Products":
      return (await getProducts()) as unknown as Record<string, unknown>[]
    case "ShippingCost":
      return (await getShippingCosts()) as unknown as Record<string, unknown>[]
    case "ShippingDelays":
      return (await getShippingDelays()) as unknown as Record<string, unknown>[]
    case "ShippingCostTimeseries":
      return (await getShippingCostTimeseries(dateFrom, dateTo)) as unknown as Record<string, unknown>[]
    case "ShippingDelaysTimeseries":
      return (await getShippingDelayTimeseries(dateFrom, dateTo)) as unknown as Record<string, unknown>[]
    default:
      return []
  }
}
