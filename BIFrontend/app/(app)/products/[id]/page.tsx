"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { getProductById, getProductSummary } from "@/lib/api/endpoints"
import type { Product, ProductSummary } from "@/lib/types"
import { GlassCard } from "@/components/glass-card"
import { KpiCard } from "@/components/kpi-card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Package, DollarSign, ShoppingCart, BarChart3 } from "lucide-react"
import Link from "next/link"

export default function ProductDetailPage() {
  const params = useParams()
  const id = Number(params.id)
  const [product, setProduct] = useState<Product | null>(null)
  const [summary, setSummary] = useState<ProductSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getProductById(id), getProductSummary(id)]).then(([p, s]) => {
      setProduct(p)
      setSummary(s)
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!product || !summary) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Product not found</p>
        <Link href="/products">
          <Button variant="ghost" size="sm" className="mt-3">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Products
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/products">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">{product.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-mono">{product.sku}</span>
            <span className="mx-2">-</span>
            Ref. Cost: ${product.ref_cost.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Sales"
          value={summary.total_sales.toLocaleString()}
          icon={<ShoppingCart className="h-5 w-5" />}
        />
        <KpiCard
          title="Total Quantity"
          value={summary.total_quantity.toLocaleString()}
          icon={<Package className="h-5 w-5" />}
        />
        <KpiCard
          title="Avg. Price"
          value={`$${summary.avg_price.toFixed(2)}`}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <KpiCard
          title="Total Revenue"
          value={`$${summary.total_revenue.toLocaleString()}`}
          icon={<BarChart3 className="h-5 w-5" />}
        />
      </div>

      <GlassCard className="p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Product Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Product ID</span>
            <p className="font-medium text-foreground mt-0.5">{product.product_id}</p>
          </div>
          <div>
            <span className="text-muted-foreground">SKU</span>
            <p className="font-mono font-medium text-foreground mt-0.5">{product.sku}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Name</span>
            <p className="font-medium text-foreground mt-0.5">{product.name}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Reference Cost</span>
            <p className="font-medium text-foreground mt-0.5">${product.ref_cost.toFixed(2)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Profit Margin</span>
            <p className="font-medium text-foreground mt-0.5">
              {summary.avg_price > 0
                ? `${(((summary.avg_price - product.ref_cost) / summary.avg_price) * 100).toFixed(1)}%`
                : "N/A"}
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
