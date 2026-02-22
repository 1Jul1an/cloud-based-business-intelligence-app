"use client"

import { useEffect, useState } from "react"
import { getProducts, getBestsellers } from "@/lib/api/endpoints"
import type { Product, Bestseller } from "@/lib/types"
import { GlassCard } from "@/components/glass-card"
import { DataTable } from "@/components/data-table"
import { ChartCanvas } from "@/components/chart-canvas"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ExternalLink, Package } from "lucide-react"

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [bestsellers, setBestsellers] = useState<Bestseller[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getProducts(), getBestsellers()]).then(([p, b]) => {
      setProducts(p)
      setBestsellers(b)
      setLoading(false)
    })
  }, [])

  const bubbleConfig = {
    type: "scatter" as const,
    data: {
      datasets: bestsellers.map((b, i) => ({
        label: b.name,
        data: [
          {
            x: b.total_revenue,
            y: b.total_profit,
          },
        ],
        backgroundColor: [
          "oklch(0.65 0.17 210 / 0.6)",
          "oklch(0.7 0.17 170 / 0.6)",
          "oklch(0.65 0.2 280 / 0.6)",
          "oklch(0.78 0.15 80 / 0.6)",
          "oklch(0.65 0.2 340 / 0.6)",
          "oklch(0.6 0.15 140 / 0.6)",
          "oklch(0.7 0.2 30 / 0.6)",
          "oklch(0.55 0.18 260 / 0.6)",
        ][i % 8],
        pointRadius: Math.max(6, Math.min(20, b.total_quantity / 200)),
        pointHoverRadius: Math.max(8, Math.min(24, b.total_quantity / 200 + 4)),
      })),
    },
    options: {
      plugins: {
        legend: { display: true, position: "bottom" as const },
        tooltip: {
          callbacks: {
            label: (ctx: { dataset: { label?: string }; raw: { x: number; y: number } }) =>
              `${ctx.dataset.label}: Revenue $${ctx.raw.x.toLocaleString()}, Profit $${ctx.raw.y.toLocaleString()}`,
          },
        },
      },
      scales: {
        x: { title: { display: true, text: "Revenue ($)" } },
        y: { title: { display: true, text: "Profit ($)" } },
      },
    },
  }

  const productColumns = [
    {
      key: "product_id",
      label: "ID",
      align: "center" as const,
    },
    {
      key: "sku",
      label: "SKU",
      render: (r: Product) => <span className="font-mono text-xs text-muted-foreground">{r.sku}</span>,
    },
    {
      key: "name",
      label: "Product Name",
      render: (r: Product) => (
        <Link href={`/products/${r.product_id}`} className="text-primary hover:underline font-medium">
          {r.name}
        </Link>
      ),
    },
    {
      key: "ref_cost",
      label: "Ref. Cost",
      align: "right" as const,
      render: (r: Product) => `$${r.ref_cost.toFixed(2)}`,
    },
    {
      key: "actions",
      label: "",
      sortable: false,
      align: "right" as const,
      render: (r: Product) => (
        <Link href={`/products/${r.product_id}`}>
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            <ExternalLink className="mr-1 h-3 w-3" />
            Details
          </Button>
        </Link>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">Products</h1>
        <p className="text-sm text-muted-foreground mt-1">Product catalog and performance analysis</p>
      </div>

      {/* Bestseller Scatter */}
      <GlassCard className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Bestseller Landscape</h3>
          <span className="text-xs text-muted-foreground">(size = quantity sold)</span>
        </div>
        {loading ? (
          <div className="h-[350px] rounded bg-muted animate-pulse" />
        ) : (
          <ChartCanvas
            config={bubbleConfig as Parameters<typeof ChartCanvas>[0]["config"]}
            height={350}
            showExport
            exportFilename="bestseller-landscape"
          />
        )}
      </GlassCard>

      {/* Products Table */}
      <DataTable
        data={products as unknown as Record<string, unknown>[]}
        columns={productColumns as { key: string; label: string; render?: (row: Record<string, unknown>) => React.ReactNode; sortable?: boolean; align?: "left" | "right" | "center" }[]}
        title="All Products"
        pageSize={10}
        loading={loading}
      />
    </div>
  )
}
