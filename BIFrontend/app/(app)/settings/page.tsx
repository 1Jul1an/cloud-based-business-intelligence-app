"use client"

import { useState } from "react"
import { useAuthStore, useFiltersStore, useSavedChartsStore } from "@/lib/stores"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { User, Database, Trash2, Shield } from "lucide-react"

export default function SettingsPage() {
  const { user } = useAuthStore()
  const { reset: resetFilters } = useFiltersStore()
  const { charts } = useSavedChartsStore()
  const [apiUrl, setApiUrl] = useState(process.env.NEXT_PUBLIC_API_BASE_URL || "")
  const [notifications, setNotifications] = useState(true)

  const handleClearCharts = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("bi.savedCharts.v1")
      toast.success("Saved charts cleared. Reload the page to see changes.")
    }
  }

  const handleResetFilters = () => {
    resetFilters()
    toast.success("Filters reset to defaults")
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your preferences and configuration</p>
      </div>

      {/* Profile */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <User className="h-4.5 w-4.5 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Profile</h2>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-foreground">Name</Label>
            <Input value={user?.name || "Demo User"} disabled className="bg-background/50" />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Email</Label>
            <Input value={user?.email || "demo@example.com"} disabled className="bg-background/50" />
          </div>
          <p className="text-xs text-muted-foreground">
            Profile editing will be available when authentication is fully integrated.
          </p>
        </div>
      </GlassCard>

      {/* API Configuration */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <Database className="h-4.5 w-4.5 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">API Configuration</h2>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-foreground">API Base URL</Label>
            <Input
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://api.example.com"
              className="bg-background/50 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Set via NEXT_PUBLIC_API_BASE_URL environment variable. Mock data is used when not configured.
            </p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground text-sm">Status</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {apiUrl ? "Connected to API" : "Using mock data"}
              </p>
            </div>
            <div className={`h-2.5 w-2.5 rounded-full ${apiUrl ? "bg-emerald-500" : "bg-amber-500"}`} />
          </div>
        </div>
      </GlassCard>

      {/* Preferences */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <Shield className="h-4.5 w-4.5 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Preferences</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground text-sm">Toast Notifications</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Show toast notifications for actions</p>
            </div>
            <Switch checked={notifications} onCheckedChange={setNotifications} />
          </div>
        </div>
      </GlassCard>

      {/* Data Management */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <Trash2 className="h-4.5 w-4.5 text-destructive-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Data Management</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Saved Charts</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {charts.length} chart{charts.length !== 1 ? "s" : ""} saved locally
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleClearCharts} className="text-destructive-foreground">
              Clear All
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Filters</p>
              <p className="text-xs text-muted-foreground mt-0.5">Reset all active filters to defaults</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleResetFilters}>
              Reset
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
