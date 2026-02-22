"use client"

import { useEffect, useRef, useCallback } from "react"
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
  LineController,
  BarController,
  DoughnutController,
  PieController,
  ScatterController,
  RadarController,
  type ChartConfiguration,
  type ChartType,
} from "chart.js"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

Chart.register(
  CategoryScale, LinearScale,
  BarElement, LineElement, PointElement, ArcElement,
  LineController, BarController, DoughnutController, PieController, ScatterController, RadarController,
  Tooltip, Legend, Filler
)

interface ChartCanvasProps {
  config: ChartConfiguration<ChartType>
  className?: string
  showExport?: boolean
  exportFilename?: string
  height?: number
}

export function ChartCanvas({ config, className, showExport = false, exportFilename = "chart", height }: ChartCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    if (chartRef.current) {
      chartRef.current.destroy()
    }

    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return

    chartRef.current = new Chart(ctx, {
      ...config,
      options: {
        ...config.options,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          ...config.options?.plugins,
          legend: {
            display: config.options?.plugins?.legend?.display ?? true,
            position: "top" as const,
            labels: {
              usePointStyle: true,
              padding: 16,
              font: { size: 12, family: "Geist" },
              ...config.options?.plugins?.legend?.labels,
            },
            ...config.options?.plugins?.legend,
          },
          tooltip: {
            backgroundColor: "rgba(0,0,0,0.8)",
            titleFont: { size: 13, family: "Geist" },
            bodyFont: { size: 12, family: "Geist" },
            padding: 12,
            cornerRadius: 8,
            ...config.options?.plugins?.tooltip,
          },
        },
        scales: config.type === "pie" || config.type === "doughnut" ? undefined : {
          x: {
            grid: { display: false },
            ticks: { font: { size: 11, family: "Geist" } },
            ...((config.options?.scales as Record<string, unknown>)?.x as object),
          },
          y: {
            grid: { color: "rgba(128,128,128,0.1)" },
            ticks: { font: { size: 11, family: "Geist" } },
            ...((config.options?.scales as Record<string, unknown>)?.y as object),
          },
        },
      },
    })

    return () => {
      chartRef.current?.destroy()
      chartRef.current = null
    }
  }, [config])

  const handleExport = useCallback(() => {
    if (!canvasRef.current) return
    const url = canvasRef.current.toDataURL("image/png")
    const a = document.createElement("a")
    a.href = url
    a.download = `${exportFilename}.png`
    a.click()
  }, [exportFilename])

  return (
    <div className={className}>
      <div className="relative" style={{ height: height || 300 }}>
        <canvas ref={canvasRef} />
      </div>
      {showExport && (
        <div className="mt-3 flex justify-end">
          <Button variant="ghost" size="sm" onClick={handleExport} className="text-xs text-muted-foreground">
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export PNG
          </Button>
        </div>
      )}
    </div>
  )
}
