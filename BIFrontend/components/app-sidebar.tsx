"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Search,
  PlusCircle,
  BookmarkCheck,
  Package,
  Truck,
  Settings,
  BarChart3,
  X,
} from "lucide-react"
import { useUIStore } from "@/lib/stores"
import { useIsMobile } from "@/hooks/use-mobile"

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/explore", label: "Explore", icon: Search },
  { href: "/charts/new", label: "Chart Builder", icon: PlusCircle },
  { href: "/charts/saved", label: "Saved Charts", icon: BookmarkCheck },
  { href: "/products", label: "Products", icon: Package },
  { href: "/shipping", label: "Shipping", icon: Truck },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { sidebarOpen, setSidebarOpen } = useUIStore()
  const isMobile = useIsMobile()

  if (!sidebarOpen && !isMobile) {
    return null
  }

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "flex flex-col h-full border-r border-sidebar-border bg-sidebar",
          isMobile
            ? "fixed inset-y-0 left-0 z-50 w-64 glass-strong"
            : "w-60 shrink-0 glass-subtle"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-5 border-b border-sidebar-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BarChart3 className="h-4.5 w-4.5" />
          </div>
          <span className="text-lg font-semibold text-sidebar-foreground tracking-tight">AWS-BI</span>
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="ml-auto p-1 rounded-md hover:bg-sidebar-accent text-sidebar-foreground"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => isMobile && setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className="h-4.5 w-4.5 shrink-0" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-4">
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-sidebar-foreground">Business Intelligence</span>
            <span className="ml-1">v1.0</span>
          </div>
        </div>
      </aside>
    </>
  )
}
