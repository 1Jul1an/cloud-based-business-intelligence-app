"use client"

import { DATASETS } from "@/lib/datasets"
import { GlassCard } from "@/components/glass-card"
import Link from "next/link"
import { ArrowRight, Database, BarChart3, TrendingUp, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Sales: <TrendingUp className="h-5 w-5" />,
  Products: <BarChart3 className="h-5 w-5" />,
  Shipping: <Truck className="h-5 w-5" />,
}

const QUICK_INSIGHTS = [
  {
    title: "Platform Comparison",
    description: "Compare revenue, profit, and margin across platforms",
    dataset: "SalesSummary",
    chartType: "bar",
  },
  {
    title: "Revenue Trend",
    description: "Analyze revenue over time with trend line",
    dataset: "SalesTimeseries",
    chartType: "line",
  },
  {
    title: "Bestseller Landscape",
    description: "Explore top products by revenue and profit",
    dataset: "Bestsellers",
    chartType: "bar",
  },
  {
    title: "Shipping Cost Analysis",
    description: "Compare shipping costs across suppliers",
    dataset: "ShippingCost",
    chartType: "bar",
  },
  {
    title: "Delivery Performance",
    description: "Track average delivery times by supplier",
    dataset: "ShippingDelays",
    chartType: "bar",
  },
  {
    title: "Shipping Cost Trend",
    description: "Monitor shipping costs over time",
    dataset: "ShippingCostTimeseries",
    chartType: "line",
  },
]

export default function ExplorePage() {
  const categories = [...new Set(DATASETS.map((d) => d.category))]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">Explore</h1>
        <p className="text-sm text-muted-foreground mt-1">Discover insights and create custom analyses</p>
      </div>

      {/* Quick Insights */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Insights</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {QUICK_INSIGHTS.map((insight) => (
            <Link
              key={insight.title}
              href={`/charts/new?dataset=${insight.dataset}&type=${insight.chartType}`}
            >
              <GlassCard className="p-5 hover:shadow-lg transition-all duration-200 cursor-pointer group h-full">
                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  {insight.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  {insight.description}
                </p>
                <div className="mt-3 flex items-center text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Open in Chart Builder
                  <ArrowRight className="ml-1 h-3 w-3" />
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      </section>

      {/* Available Datasets */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Available Datasets</h2>
        {categories.map((cat) => (
          <div key={cat} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                {CATEGORY_ICONS[cat] || <Database className="h-4 w-4" />}
              </div>
              <h3 className="text-sm font-semibold text-foreground">{cat}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {DATASETS.filter((d) => d.category === cat).map((ds) => (
                <GlassCard key={ds.id} variant="subtle" className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-foreground">{ds.label}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {ds.fields.length} fields: {ds.fields.map((f) => f.label).join(", ")}
                      </p>
                    </div>
                    <Link href={`/charts/new?dataset=${ds.id}`}>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs shrink-0">
                        <BarChart3 className="mr-1 h-3 w-3" />
                        Chart
                      </Button>
                    </Link>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
