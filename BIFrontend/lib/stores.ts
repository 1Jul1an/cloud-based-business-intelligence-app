"use client"

import { create } from "zustand"
import type { AuthState, AuthUser, FilterState, ChartDefinition } from "./types"

// ── Auth Store ──

interface AuthStore extends AuthState {
  login: (user: AuthUser, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  isAuthenticated: false,
  user: null,
  token: null,
  login: (user, token) => set({ isAuthenticated: true, user, token }),
  logout: () => set({ isAuthenticated: false, user: null, token: null }),
}))

// ── UI Store ──

interface UIStore {
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))

// ── Filter Store ──

const today = new Date()
const thirtyDaysAgo = new Date(today)
thirtyDaysAgo.setDate(today.getDate() - 30)

interface FiltersStore extends FilterState {
  setDateRange: (from: string, to: string) => void
  setPlatformIds: (ids: number[]) => void
  setProductIds: (ids: number[]) => void
  reset: () => void
}

const defaultFilters: FilterState = {
  dateFrom: thirtyDaysAgo.toISOString().slice(0, 10),
  dateTo: today.toISOString().slice(0, 10),
  platformIds: [],
  productIds: [],
}

export const useFiltersStore = create<FiltersStore>((set) => ({
  ...defaultFilters,
  setDateRange: (from, to) => set({ dateFrom: from, dateTo: to }),
  setPlatformIds: (ids) => set({ platformIds: ids }),
  setProductIds: (ids) => set({ productIds: ids }),
  reset: () => set(defaultFilters),
}))

// ── Saved Charts Store ──

const CHARTS_KEY = "bi.savedCharts.v1"

function loadChartsFromStorage(): ChartDefinition[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(CHARTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveChartsToStorage(charts: ChartDefinition[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(CHARTS_KEY, JSON.stringify(charts))
  } catch {
    // silently fail
  }
}

interface SavedChartsStore {
  charts: ChartDefinition[]
  initialized: boolean
  init: () => void
  addChart: (chart: ChartDefinition) => void
  updateChart: (id: string, updates: Partial<ChartDefinition>) => void
  deleteChart: (id: string) => void
  duplicateChart: (id: string) => ChartDefinition | null
}

export const useSavedChartsStore = create<SavedChartsStore>((set, get) => ({
  charts: [],
  initialized: false,
  init: () => {
    if (get().initialized) return
    const charts = loadChartsFromStorage()
    set({ charts, initialized: true })
  },
  addChart: (chart) => {
    const updated = [...get().charts, chart]
    set({ charts: updated })
    saveChartsToStorage(updated)
  },
  updateChart: (id, updates) => {
    const updated = get().charts.map((c) =>
      c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
    )
    set({ charts: updated })
    saveChartsToStorage(updated)
  },
  deleteChart: (id) => {
    const updated = get().charts.filter((c) => c.id !== id)
    set({ charts: updated })
    saveChartsToStorage(updated)
  },
  duplicateChart: (id) => {
    const original = get().charts.find((c) => c.id === id)
    if (!original) return null
    const dup: ChartDefinition = {
      ...original,
      id: crypto.randomUUID(),
      name: `${original.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const updated = [...get().charts, dup]
    set({ charts: updated })
    saveChartsToStorage(updated)
    return dup
  },
}))
