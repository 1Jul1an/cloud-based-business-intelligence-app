"use client"

import { useFiltersStore } from "@/lib/stores"
import { Button } from "@/components/ui/button"
import { CalendarDays } from "lucide-react"

const PRESETS = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
]

export function DashboardFilters() {
  const { dateFrom, dateTo, setDateRange } = useFiltersStore()

  const handlePreset = (days: number) => {
    const to = new Date()
    const from = new Date()
    from.setDate(to.getDate() - days)
    setDateRange(from.toISOString().slice(0, 10), to.toISOString().slice(0, 10))
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-background/50 p-1">
        {PRESETS.map((p) => {
          const to = new Date()
          const from = new Date()
          from.setDate(to.getDate() - p.days)
          const isActive = dateFrom === from.toISOString().slice(0, 10)
          return (
            <Button
              key={p.label}
              variant={isActive ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => handlePreset(p.days)}
            >
              {p.label}
            </Button>
          )
        })}
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarDays className="h-3.5 w-3.5" />
        <span>{dateFrom}</span>
        <span>-</span>
        <span>{dateTo}</span>
      </div>
    </div>
  )
}
