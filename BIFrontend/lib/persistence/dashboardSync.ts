import type { DashboardState, DashboardMeta } from "../types"
import { loadDashboardRemote, saveDashboardRemote } from "../api/endpoints"

const LOCAL_KEY = (userId: string) => `bi.dashboard.${userId}.v1`

function getLocal(userId: string): DashboardState | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(LOCAL_KEY(userId))
    return raw ? (JSON.parse(raw) as DashboardState) : null
  } catch {
    return null
  }
}

function setLocal(userId: string, state: DashboardState): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(LOCAL_KEY(userId), JSON.stringify(state))
  } catch {
    // storage full - silently fail
  }
}

export async function loadDashboard(userId: string): Promise<DashboardState> {
  const local = getLocal(userId)

  // try remote
  try {
    const remote = await loadDashboardRemote(userId)
    if (remote) {
      // last-write-wins
      if (!local || new Date(remote.updatedAt) > new Date(local.updatedAt)) {
        setLocal(userId, remote)
        return remote
      }
    }
  } catch {
    // remote unavailable, that's okay
  }

  if (local) return local

  // default empty
  const defaultState: DashboardState = {
    userId,
    charts: [],
    layout: [],
    updatedAt: new Date().toISOString(),
  }
  setLocal(userId, defaultState)
  return defaultState
}

export async function saveDashboard(userId: string, state: DashboardState): Promise<void> {
  const updated = { ...state, updatedAt: new Date().toISOString() }
  setLocal(userId, updated)

  // best-effort remote sync
  try {
    await saveDashboardRemote(userId, updated)
  } catch {
    // offline-first: fail silently
  }
}

export async function listDashboards(userId: string): Promise<DashboardMeta[]> {
  const local = getLocal(userId)
  if (!local) return []
  return [
    {
      userId: local.userId,
      updatedAt: local.updatedAt,
      chartCount: local.charts.length,
    },
  ]
}
