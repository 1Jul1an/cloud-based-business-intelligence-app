"use client"

import { cn } from "@/lib/utils"
import { GlassCard } from "./glass-card"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface KpiCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon?: React.ReactNode
  className?: string
  loading?: boolean
}

export function KpiCard({ title, value, change, changeLabel, icon, className, loading }: KpiCardProps) {
  if (loading) {
    return (
      <GlassCard className={cn("p-6", className)}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
            <div className="mt-3 h-8 w-32 rounded bg-muted animate-pulse" />
            <div className="mt-2 h-3 w-20 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
        </div>
      </GlassCard>
    )
  }

  const trendIcon =
    change === undefined ? null : change > 0 ? (
      <TrendingUp className="h-3.5 w-3.5" />
    ) : change < 0 ? (
      <TrendingDown className="h-3.5 w-3.5" />
    ) : (
      <Minus className="h-3.5 w-3.5" />
    )

  const trendColor =
    change === undefined
      ? ""
      : change > 0
        ? "text-emerald-600 dark:text-emerald-400"
        : change < 0
          ? "text-red-500 dark:text-red-400"
          : "text-muted-foreground"

  return (
    <GlassCard className={cn("p-6 hover:shadow-lg transition-shadow duration-300", className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{typeof value === "number" ? value.toLocaleString() : value}</p>
          {change !== undefined && (
            <div className={cn("mt-2 flex items-center gap-1 text-xs font-medium", trendColor)}>
              {trendIcon}
              <span>{change > 0 ? "+" : ""}{change.toFixed(1)}%</span>
              {changeLabel && <span className="text-muted-foreground ml-1">{changeLabel}</span>}
            </div>
          )}
        </div>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            {icon}
          </div>
        )}
      </div>
    </GlassCard>
  )
}
