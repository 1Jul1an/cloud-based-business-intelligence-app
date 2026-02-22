"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore, useUIStore, useSavedChartsStore } from "@/lib/stores"
import { AppSidebar } from "@/components/app-sidebar"
import { Topbar } from "@/components/topbar"
import { cn } from "@/lib/utils"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, login } = useAuthStore()
  const { sidebarOpen } = useUIStore()
  const { init } = useSavedChartsStore()
  const router = useRouter()

  useEffect(() => {
    // Auto-login for demo if not authenticated
    if (!isAuthenticated) {
      login(
        { id: "demo-user", email: "demo@example.com", name: "Demo User" },
        "demo-token"
      )
    }
  }, [isAuthenticated, login, router])

  useEffect(() => {
    init()
  }, [init])

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <div className={cn("flex flex-1 flex-col overflow-hidden transition-all duration-300")}>
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
