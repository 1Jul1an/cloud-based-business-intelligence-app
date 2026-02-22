"use client"

import { useState, useMemo } from "react"
import { useSavedChartsStore } from "@/lib/stores"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, MoreVertical, Copy, Trash2, ExternalLink, Tag, BarChart3, PlusCircle, ArrowUpDown } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { DATASETS } from "@/lib/datasets"

type SortKey = "name" | "updatedAt" | "createdAt"

export default function SavedChartsPage() {
  const { charts, deleteChart, duplicateChart } = useSavedChartsStore()
  const [search, setSearch] = useState("")
  const [filterTag, setFilterTag] = useState("")
  const [sortBy, setSortBy] = useState<SortKey>("updatedAt")

  const allTags = useMemo(() => {
    const tags = new Set<string>()
    charts.forEach((c) => c.tags.forEach((t) => tags.add(t)))
    return [...tags]
  }, [charts])

  const filtered = useMemo(() => {
    let result = charts
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q))
      )
    }
    if (filterTag) {
      result = result.filter((c) => c.tags.includes(filterTag))
    }
    return [...result].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name)
      return new Date(b[sortBy]).getTime() - new Date(a[sortBy]).getTime()
    })
  }, [charts, search, filterTag, sortBy])

  const handleDuplicate = (id: string) => {
    const dup = duplicateChart(id)
    if (dup) toast.success(`Duplicated as "${dup.name}"`)
  }

  const handleDelete = (id: string) => {
    deleteChart(id)
    toast.success("Chart deleted")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">Saved Charts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {charts.length} chart{charts.length !== 1 ? "s" : ""} saved locally
          </p>
        </div>
        <Link href="/charts/new">
          <Button size="sm">
            <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
            New Chart
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search charts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm bg-background/50"
          />
        </div>
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Button
              variant={filterTag === "" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => setFilterTag("")}
            >
              All
            </Button>
            {allTags.map((tag) => (
              <Button
                key={tag}
                variant={filterTag === tag ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2.5 text-xs"
                onClick={() => setFilterTag(tag)}
              >
                {tag}
              </Button>
            ))}
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground"
          onClick={() => setSortBy(sortBy === "updatedAt" ? "name" : sortBy === "name" ? "createdAt" : "updatedAt")}
        >
          <ArrowUpDown className="mr-1 h-3 w-3" />
          {sortBy === "updatedAt" ? "Recent" : sortBy === "name" ? "Name" : "Created"}
        </Button>
      </div>

      {/* Chart Grid */}
      {filtered.length === 0 ? (
        <GlassCard className="p-12 flex flex-col items-center justify-center text-center">
          <BarChart3 className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-foreground">No saved charts</p>
          <p className="text-xs text-muted-foreground mt-1">
            {charts.length === 0
              ? "Create your first chart in the Chart Builder"
              : "No charts match your filters"}
          </p>
          <Link href="/charts/new">
            <Button size="sm" className="mt-4">
              <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
              Create Chart
            </Button>
          </Link>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((chart) => {
            const ds = DATASETS.find((d) => d.id === chart.datasetId)
            return (
              <GlassCard key={chart.id} className="p-5 flex flex-col">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">{chart.name}</h3>
                    {chart.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{chart.description}</p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem asChild>
                        <Link href={`/charts/new?dataset=${chart.datasetId}&type=${chart.chartType}`}>
                          <ExternalLink className="mr-2 h-3.5 w-3.5" />
                          Open
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(chart.id)}>
                        <Copy className="mr-2 h-3.5 w-3.5" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(chart.id)} className="text-destructive-foreground">
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="capitalize">{chart.chartType}</span>
                  <span>-</span>
                  <span>{ds?.label || chart.datasetId}</span>
                </div>

                {chart.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {chart.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-auto pt-3 text-[10px] text-muted-foreground">
                  Updated {new Date(chart.updatedAt).toLocaleDateString()}
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
