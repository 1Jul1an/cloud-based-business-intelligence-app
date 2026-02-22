"use client"

import { useEffect, useState, useMemo } from "react"
import { useFiltersStore } from "@/lib/stores"
import { getSalesSummary, getTimeseries, getBestsellers } from "@/lib/api/endpoints"
import type { SalesSummary, TimeseriesPoint, Bestseller } from "@/lib/types"
import { KpiCard } from "@/components/kpi-card"
import { GlassCard } from "@/components/glass-card"
import { ChartCanvas } from "@/components/chart-canvas"
import { DataTable } from "@/components/data-table"
import { DollarSign, ShoppingCart, TrendingUp, BarChart3 } from "lucide-react"
import { DashboardFilters } from "./filters"

export default function DashboardPage() {
  const { dateFrom, dateTo } = useFiltersStore()
  const [summary, setSummary] = useState<SalesSummary[]>([])
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([])
  const [bestsellers, setBestsellers] = useState<Bestseller[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getSalesSummary(),
      getTimeseries(dateFrom, dateTo),
      getBestsellers(),
    ]).then(([s, t, b]) => {
      setSummary(s)
      setTimeseries(t)
      setBestsellers(b)
      setLoading(false)
    })
  }, [dateFrom, dateTo])

  const totals = useMemo(() => {
    const totalRevenue = summary.reduce((acc, s) => acc + s.total_revenue, 0)
    const totalProfit = summary.reduce((acc, s) => acc + s.total_profit, 0)
    const totalSales = summary.reduce((acc, s) => acc + s.total_sales_count, 0)
    const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
    return { totalRevenue, totalProfit, totalSales, margin }
  }, [summary])

  const revenueChartConfig = useMemo(() => {
    const labels = timeseries.map((p) => {
      const d = new Date(p.date)
      return d.toLocaleDateString("en", { month: "short", day: "numeric" })
    })
    return {
      type: "line" as const,
      data: {
        labels,
        datasets: [
          {
            label: "Revenue",
            data: timeseries.map((p) => p.total_revenue),
            borderColor: "oklch(0.65 0.17 210)",
            backgroundColor: "oklch(0.65 0.17 210 / 0.1)",
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
            borderWidth: 2,
          },
          {
            label: "Profit",
            data: timeseries.map((p) => p.total_profit),
            borderColor: "oklch(0.7 0.17 170)",
            backgroundColor: "oklch(0.7 0.17 170 / 0.1)",
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
            borderWidth: 2,
          },
        ],
      },
      options: {
        plugins: { legend: { display: true } },
      },
    }
  }, [timeseries])

  const platformChartConfig = useMemo(() => ({
    type: "doughnut" as const,
    data: {
      labels: summary.map((s) => s.platform),
      datasets: [
        {
          data: summary.map((s) => s.total_revenue),
          backgroundColor: [
            "oklch(0.65 0.17 210)",
            "oklch(0.7 0.17 170)",
            "oklch(0.65 0.2 280)",
            "oklch(0.78 0.15 80)",
          ],
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    },
    options: {
      cutout: "65%",
      plugins: {
        legend: { display: true, position: "bottom" as const },
      },
    },
  }), [summary])

  const bestsellersChartConfig = useMemo(() => ({
    type: "bar" as const,
    data: {
      labels: bestsellers.slice(0, 6).map((b) => b.name.length > 14 ? b.name.slice(0, 14) + "..." : b.name),
      datasets: [
        {
          label: "Revenue",
          data: bestsellers.slice(0, 6).map((b) => b.total_revenue),
          backgroundColor: "oklch(0.65 0.17 210 / 0.7)",
          borderRadius: 6,
          borderSkipped: false,
        },
        {
          label: "Profit",
          data: bestsellers.slice(0, 6).map((b) => b.total_profit),
          backgroundColor: "oklch(0.7 0.17 170 / 0.7)",
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    },
    options: {
      plugins: { legend: { display: true } },
    },
  }), [bestsellers])

  const tableColumns = [
    { key: "platform", label: "Platform" },
    { key: "total_sales_count", label: "Sales", align: "right" as const, render: (r: SalesSummary) => r.total_sales_count.toLocaleString() },
    { key: "total_revenue", label: "Revenue", align: "right" as const, render: (r: SalesSummary) => `$${r.total_revenue.toLocaleString()}` },
    { key: "total_profit", label: "Profit", align: "right" as const, render: (r: SalesSummary) => `$${r.total_profit.toLocaleString()}` },
    { key: "margin", label: "Margin", align: "right" as const, render: (r: SalesSummary) => `${((r.total_profit / r.total_revenue) * 100).toFixed(1)}%` },
  ]

  const tableData = summary.map((s) => ({ ...s, margin: ((s.total_profit / s.total_revenue) * 100).toFixed(1) }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Business intelligence overview</p>
        </div>
        <DashboardFilters />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Revenue"
          value={`$${totals.totalRevenue.toLocaleString()}`}
          change={12.5}
          changeLabel="vs last period"
          icon={<DollarSign className="h-5 w-5" />}
          loading={loading}
        />
        <KpiCard
          title="Total Profit"
          value={`$${totals.totalProfit.toLocaleString()}`}
          change={8.2}
          changeLabel="vs last period"
          icon={<TrendingUp className="h-5 w-5" />}
          loading={loading}
        />
        <KpiCard
          title="Total Sales"
          value={totals.totalSales}
          change={-2.1}
          changeLabel="vs last period"
          icon={<ShoppingCart className="h-5 w-5" />}
          loading={loading}
        />
        <KpiCard
          title="Avg. Margin"
          value={`${totals.margin.toFixed(1)}%`}
          change={1.3}
          changeLabel="vs last period"
          icon={<BarChart3 className="h-5 w-5" />}
          loading={loading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground mb-4">Revenue & Profit Trend</h3>
          {loading ? (
            <div className="h-[300px] rounded bg-muted animate-pulse" />
          ) : (
            <ChartCanvas config={revenueChartConfig} showExport exportFilename="revenue-trend" />
          )}
        </GlassCard>
        <GlassCard className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Revenue by Platform</h3>
          {loading ? (
            <div className="h-[300px] rounded bg-muted animate-pulse" />
          ) : (
            <ChartCanvas config={platformChartConfig} showExport exportFilename="platform-revenue" />
          )}
        </GlassCard>
      </div>

      {/* Bestsellers Chart */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Top Products - Revenue & Profit</h3>
        {loading ? (
          <div className="h-[300px] rounded bg-muted animate-pulse" />
        ) : (
          <ChartCanvas config={bestsellersChartConfig} showExport exportFilename="top-products" />
        )}
      </GlassCard>

      {/* Summary Table */}
      <DataTable
        data={tableData as unknown as Record<string, unknown>[]}
        columns={tableColumns as { key: string; label: string; render?: (row: Record<string, unknown>) => React.ReactNode; sortable?: boolean; align?: "left" | "right" | "center" }[]}
        title="Platform Summary"
        pageSize={10}
        loading={loading}
      />
    </div>
  )
}
