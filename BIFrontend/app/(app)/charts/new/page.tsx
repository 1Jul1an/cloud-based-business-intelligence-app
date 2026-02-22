"use client"

import { useState, useEffect, useMemo, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { DATASETS } from "@/lib/datasets"
import { GlassCard } from "@/components/glass-card"
import { ChartCanvas } from "@/components/chart-canvas"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useSavedChartsStore, useFiltersStore } from "@/lib/stores"
import type { ChartDefinition, ChartType, DatasetId } from "@/lib/types"
import { Save, Eye, Download, Tag } from "lucide-react"
import { toast } from "sonner"
import { fetchDatasetData } from "./fetch-data"

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: "line", label: "Line" },
  { value: "bar", label: "Bar" },
  { value: "pie", label: "Pie" },
  { value: "doughnut", label: "Doughnut" },
  { value: "scatter", label: "Scatter" },
]

const COLORS = [
  "oklch(0.65 0.17 210)",
  "oklch(0.7 0.17 170)",
  "oklch(0.65 0.2 280)",
  "oklch(0.78 0.15 80)",
  "oklch(0.65 0.2 340)",
]

function ChartBuilderInner() {
  const searchParams = useSearchParams()
  const { addChart } = useSavedChartsStore()
  const { dateFrom, dateTo } = useFiltersStore()

  const [name, setName] = useState("Untitled Chart")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState("")
  const [datasetId, setDatasetId] = useState<DatasetId>(
    (searchParams.get("dataset") as DatasetId) || "SalesTimeseries"
  )
  const [chartType, setChartType] = useState<ChartType>(
    (searchParams.get("type") as ChartType) || "line"
  )
  const [xField, setXField] = useState("")
  const [yFields, setYFields] = useState<string[]>([])
  const [stacked, setStacked] = useState(false)
  const [showLegend, setShowLegend] = useState(true)
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [previewing, setPreviewing] = useState(false)

  const dataset = DATASETS.find((d) => d.id === datasetId)
  const stringFields = dataset?.fields.filter((f) => f.type === "string" || f.type === "date") || []
  const numberFields = dataset?.fields.filter((f) => f.type === "number") || []

  useEffect(() => {
    if (dataset) {
      const defaultX = stringFields[0]?.key || dataset.fields[0]?.key || ""
      const defaultY = numberFields.map((f) => f.key).slice(0, 2)
      setXField(defaultX)
      setYFields(defaultY)
    }
  }, [datasetId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePreview = useCallback(async () => {
    setPreviewing(true)
    try {
      const result = await fetchDatasetData(datasetId, dateFrom, dateTo)
      setData(result)
    } catch {
      toast.error("Failed to load data")
    }
    setPreviewing(false)
  }, [datasetId, dateFrom, dateTo])

  useEffect(() => {
    handlePreview()
  }, [handlePreview])

  const chartConfig = useMemo(() => {
    if (!data.length || !xField || !yFields.length) return null

    const labels = data.map((row) => String(row[xField] ?? ""))

    if (chartType === "pie" || chartType === "doughnut") {
      return {
        type: chartType,
        data: {
          labels,
          datasets: [
            {
              data: data.map((row) => Number(row[yFields[0]] ?? 0)),
              backgroundColor: COLORS.slice(0, data.length),
              borderWidth: 0,
            },
          ],
        },
        options: {
          plugins: { legend: { display: showLegend } },
        },
      }
    }

    if (chartType === "scatter") {
      return {
        type: "scatter" as const,
        data: {
          datasets: [
            {
              label: `${yFields[0]} vs ${yFields[1] || yFields[0]}`,
              data: data.map((row) => ({
                x: Number(row[yFields[0]] ?? 0),
                y: Number(row[yFields[1] || yFields[0]] ?? 0),
              })),
              backgroundColor: COLORS[0],
              pointRadius: 5,
            },
          ],
        },
        options: {
          plugins: { legend: { display: showLegend } },
        },
      }
    }

    return {
      type: chartType,
      data: {
        labels,
        datasets: yFields.map((field, i) => ({
          label: dataset?.fields.find((f) => f.key === field)?.label || field,
          data: data.map((row) => Number(row[field] ?? 0)),
          borderColor: COLORS[i % COLORS.length],
          backgroundColor:
            chartType === "bar"
              ? COLORS[i % COLORS.length].replace(")", " / 0.7)")
              : COLORS[i % COLORS.length].replace(")", " / 0.1)"),
          fill: chartType === "line",
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2,
          borderRadius: chartType === "bar" ? 6 : undefined,
          borderSkipped: chartType === "bar" ? false : undefined,
        })),
      },
      options: {
        plugins: { legend: { display: showLegend } },
        scales: {
          x: { stacked },
          y: { stacked },
        },
      },
    }
  }, [data, xField, yFields, chartType, stacked, showLegend, dataset])

  const handleSave = () => {
    const chart: ChartDefinition = {
      id: crypto.randomUUID(),
      name,
      description,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      datasetId,
      chartType,
      xField,
      yFields,
      filters: { from: dateFrom, to: dateTo },
      options: { stacked, showLegend },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    addChart(chart)
    toast.success("Chart saved successfully")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">Chart Builder</h1>
          <p className="text-sm text-muted-foreground mt-1">Create and configure custom charts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePreview} disabled={previewing}>
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            {previewing ? "Loading..." : "Preview"}
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            Save Chart
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <GlassCard className="p-5 space-y-5 lg:col-span-1">
          <div className="space-y-2">
            <Label className="text-foreground">Chart Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-background/50" />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" className="bg-background/50" />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Dataset</Label>
            <Select value={datasetId} onValueChange={(v) => setDatasetId(v as DatasetId)}>
              <SelectTrigger className="bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATASETS.map((ds) => (
                  <SelectItem key={ds.id} value={ds.id}>{ds.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Chart Type</Label>
            <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
              <SelectTrigger className="bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHART_TYPES.map((ct) => (
                  <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">X Axis</Label>
            <Select value={xField} onValueChange={setXField}>
              <SelectTrigger className="bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dataset?.fields.map((f) => (
                  <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Y Axis Fields</Label>
            <div className="space-y-1.5">
              {numberFields.map((f) => (
                <label key={f.key} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={yFields.includes(f.key)}
                    onChange={(e) => {
                      if (e.target.checked) setYFields([...yFields, f.key])
                      else setYFields(yFields.filter((y) => y !== f.key))
                    }}
                    className="rounded border-border"
                  />
                  {f.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <Label className="text-foreground text-sm">Stacked</Label>
              <Switch checked={stacked} onCheckedChange={setStacked} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-foreground text-sm">Show Legend</Label>
              <Switch checked={showLegend} onCheckedChange={setShowLegend} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              Tags
            </Label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="revenue, monthly, comparison" className="bg-background/50 text-sm" />
          </div>
        </GlassCard>

        {/* Preview Panel */}
        <GlassCard className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">{name || "Preview"}</h3>
            {chartConfig && (
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Export PNG
              </Button>
            )}
          </div>
          {previewing ? (
            <div className="h-[400px] rounded bg-muted animate-pulse" />
          ) : chartConfig ? (
            <ChartCanvas
              config={chartConfig as Parameters<typeof ChartCanvas>[0]["config"]}
              height={400}
              showExport
              exportFilename={name.replace(/\s+/g, "-").toLowerCase()}
            />
          ) : (
            <div className="h-[400px] flex items-center justify-center text-sm text-muted-foreground">
              Configure your chart and click Preview
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  )
}

export default function ChartBuilderPage() {
  return (
    <Suspense fallback={<div className="space-y-6"><div className="h-8 w-48 bg-muted animate-pulse rounded" /><div className="h-96 bg-muted animate-pulse rounded-xl" /></div>}>
      <ChartBuilderInner />
    </Suspense>
  )
}
