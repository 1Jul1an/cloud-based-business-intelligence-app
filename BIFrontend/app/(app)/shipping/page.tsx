"use client"

import { useEffect, useState, useMemo } from "react"
import {
  getShippingCosts,
  getShippingDelays,
  getShippingCostTimeseries,
  getShippingDelayTimeseries,
} from "@/lib/api/endpoints"
import { useFiltersStore } from "@/lib/stores"
import type { ShippingCost, ShippingDelay, ShippingCostTimeseries, ShippingDelayTimeseries } from "@/lib/types"
import { GlassCard } from "@/components/glass-card"
import { ChartCanvas } from "@/components/chart-canvas"
import { KpiCard } from "@/components/kpi-card"
import { DataTable } from "@/components/data-table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DollarSign, Clock, Truck } from "lucide-react"

export default function ShippingPage() {
  const { dateFrom, dateTo } = useFiltersStore()
  const [costs, setCosts] = useState<ShippingCost[]>([])
  const [delays, setDelays] = useState<ShippingDelay[]>([])
  const [costTs, setCostTs] = useState<ShippingCostTimeseries[]>([])
  const [delayTs, setDelayTs] = useState<ShippingDelayTimeseries[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getShippingCosts(),
      getShippingDelays(),
      getShippingCostTimeseries(dateFrom, dateTo),
      getShippingDelayTimeseries(dateFrom, dateTo),
    ]).then(([c, d, ct, dt]) => {
      setCosts(c)
      setDelays(d)
      setCostTs(ct)
      setDelayTs(dt)
      setLoading(false)
    })
  }, [dateFrom, dateTo])

  const totalCost = costs.reduce((acc, c) => acc + c.total_shipping_cost, 0)
  const avgDelay = delays.length
    ? delays.reduce((acc, d) => acc + d.average_delivery_time_days, 0) / delays.length
    : 0
  const fastestSupplier = [...delays].sort((a, b) => a.average_delivery_time_days - b.average_delivery_time_days)[0]

  const costBarConfig = useMemo(
    () => ({
      type: "bar" as const,
      data: {
        labels: costs.map((c) => c.supplier_name),
        datasets: [
          {
            label: "Shipping Cost ($)",
            data: costs.map((c) => c.total_shipping_cost),
            backgroundColor: "oklch(0.65 0.17 210 / 0.7)",
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      },
      options: { plugins: { legend: { display: false } } },
    }),
    [costs]
  )

  const delayBarConfig = useMemo(
    () => ({
      type: "bar" as const,
      data: {
        labels: delays.map((d) => d.supplier_name),
        datasets: [
          {
            label: "Avg Delivery Days",
            data: delays.map((d) => d.average_delivery_time_days),
            backgroundColor: "oklch(0.7 0.17 170 / 0.7)",
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      },
      options: { plugins: { legend: { display: false } } },
    }),
    [delays]
  )

  const scatterConfig = useMemo(
    () => ({
      type: "scatter" as const,
      data: {
        datasets: [
          {
            label: "Cost vs Delay",
            data: costs.map((c) => {
              const d = delays.find((dl) => dl.supplier_name === c.supplier_name)
              return { x: c.total_shipping_cost, y: d?.average_delivery_time_days || 0 }
            }),
            backgroundColor: "oklch(0.65 0.2 280 / 0.7)",
            pointRadius: 8,
            pointHoverRadius: 12,
          },
        ],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { title: { display: true, text: "Shipping Cost ($)" } },
          y: { title: { display: true, text: "Avg Delivery Days" } },
        },
      },
    }),
    [costs, delays]
  )

  const costTsConfig = useMemo(
    () => ({
      type: "line" as const,
      data: {
        labels: costTs.map((p) => new Date(p.order_date).toLocaleDateString("en", { month: "short", day: "numeric" })),
        datasets: [
          {
            label: "Daily Shipping Cost",
            data: costTs.map((p) => p.daily_shipping_cost),
            borderColor: "oklch(0.65 0.17 210)",
            backgroundColor: "oklch(0.65 0.17 210 / 0.1)",
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            borderWidth: 2,
          },
        ],
      },
      options: { plugins: { legend: { display: false } } },
    }),
    [costTs]
  )

  const delayTsConfig = useMemo(
    () => ({
      type: "line" as const,
      data: {
        labels: delayTs.map((p) => new Date(p.order_date).toLocaleDateString("en", { month: "short", day: "numeric" })),
        datasets: [
          {
            label: "Avg Daily Delivery Time",
            data: delayTs.map((p) => p.average_daily_delivery_time_days),
            borderColor: "oklch(0.7 0.17 170)",
            backgroundColor: "oklch(0.7 0.17 170 / 0.1)",
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            borderWidth: 2,
          },
        ],
      },
      options: { plugins: { legend: { display: false } } },
    }),
    [delayTs]
  )

  const costTableColumns = [
    { key: "supplier_name", label: "Supplier" },
    { key: "total_shipping_cost", label: "Total Cost", align: "right" as const, render: (r: ShippingCost) => `$${r.total_shipping_cost.toLocaleString()}` },
  ]

  const delayTableColumns = [
    { key: "supplier_name", label: "Supplier" },
    { key: "average_delivery_time_days", label: "Avg Days", align: "right" as const, render: (r: ShippingDelay) => `${r.average_delivery_time_days.toFixed(1)} days` },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">Shipping</h1>
        <p className="text-sm text-muted-foreground mt-1">Shipping costs and delivery performance</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Total Shipping Cost"
          value={`$${totalCost.toLocaleString()}`}
          icon={<DollarSign className="h-5 w-5" />}
          loading={loading}
        />
        <KpiCard
          title="Avg Delivery Time"
          value={`${avgDelay.toFixed(1)} days`}
          icon={<Clock className="h-5 w-5" />}
          loading={loading}
        />
        <KpiCard
          title="Fastest Supplier"
          value={fastestSupplier?.supplier_name || "N/A"}
          icon={<Truck className="h-5 w-5" />}
          loading={loading}
        />
      </div>

      {/* Supplier Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Shipping Cost by Supplier</h3>
          {loading ? (
            <div className="h-[280px] rounded bg-muted animate-pulse" />
          ) : (
            <ChartCanvas config={costBarConfig} height={280} showExport exportFilename="shipping-costs" />
          )}
        </GlassCard>
        <GlassCard className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Avg Delivery Time by Supplier</h3>
          {loading ? (
            <div className="h-[280px] rounded bg-muted animate-pulse" />
          ) : (
            <ChartCanvas config={delayBarConfig} height={280} showExport exportFilename="delivery-times" />
          )}
        </GlassCard>
      </div>

      {/* Cost vs Delay Scatter */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Cost vs Delivery Time (Supplier Comparison)</h3>
        {loading ? (
          <div className="h-[300px] rounded bg-muted animate-pulse" />
        ) : (
          <ChartCanvas config={scatterConfig} height={300} showExport exportFilename="cost-vs-delay" />
        )}
      </GlassCard>

      {/* Timeseries */}
      <Tabs defaultValue="cost" className="w-full">
        <TabsList className="glass-subtle">
          <TabsTrigger value="cost">Cost Trend</TabsTrigger>
          <TabsTrigger value="delay">Delay Trend</TabsTrigger>
        </TabsList>
        <TabsContent value="cost">
          <GlassCard className="p-5 mt-3">
            <h3 className="text-sm font-semibold text-foreground mb-4">Daily Shipping Cost</h3>
            {loading ? (
              <div className="h-[280px] rounded bg-muted animate-pulse" />
            ) : (
              <ChartCanvas config={costTsConfig} height={280} showExport exportFilename="shipping-cost-trend" />
            )}
          </GlassCard>
        </TabsContent>
        <TabsContent value="delay">
          <GlassCard className="p-5 mt-3">
            <h3 className="text-sm font-semibold text-foreground mb-4">Daily Avg Delivery Time</h3>
            {loading ? (
              <div className="h-[280px] rounded bg-muted animate-pulse" />
            ) : (
              <ChartCanvas config={delayTsConfig} height={280} showExport exportFilename="delivery-time-trend" />
            )}
          </GlassCard>
        </TabsContent>
      </Tabs>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DataTable
          data={costs as unknown as Record<string, unknown>[]}
          columns={costTableColumns as { key: string; label: string; render?: (row: Record<string, unknown>) => React.ReactNode; sortable?: boolean; align?: "left" | "right" | "center" }[]}
          title="Shipping Costs"
          pageSize={10}
          loading={loading}
        />
        <DataTable
          data={delays as unknown as Record<string, unknown>[]}
          columns={delayTableColumns as { key: string; label: string; render?: (row: Record<string, unknown>) => React.ReactNode; sortable?: boolean; align?: "left" | "right" | "center" }[]}
          title="Delivery Times"
          pageSize={10}
          loading={loading}
        />
      </div>
    </div>
  )
}
