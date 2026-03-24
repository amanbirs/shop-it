"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronLeft, ChevronRight, Plus, Settings } from "lucide-react"
import { cn, getCategoryEmoji } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type SidebarList = {
  id: string
  name: string
  category: string | null
  category_emoji?: string
  role: string
}

type SidebarProps = {
  ownedLists: SidebarList[]
  sharedLists: SidebarList[]
  onCreateList?: () => void
}

export function Sidebar({ ownedLists, sharedLists, onCreateList }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  // Read from localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed")
    if (stored === "true") setCollapsed(true)
  }, [])

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed))
  }, [collapsed])

  return (
    <aside
      className={cn(
        "hidden lg:flex h-screen flex-col border-r border-border bg-card transition-[width] duration-200 ease-out shrink-0",
        collapsed ? "w-14" : "w-64"
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="flex h-12 items-center border-b border-border px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-semibold">◆</span>
          {!collapsed && (
            <span className="text-lg font-semibold">ShopIt</span>
          )}
        </Link>
      </div>

      {/* List navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {/* Your Lists */}
        <div>
          <div className="flex items-center justify-between px-2 pb-1">
            {!collapsed && (
              <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
                Your Lists
              </p>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground"
              onClick={onCreateList}
              aria-label="New list"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          {ownedLists.map((list) => {
            const emoji = list.category_emoji || getCategoryEmoji(list.category)
            const isActive = pathname === `/lists/${list.id}`
            return (
              <Link
                key={list.id}
                href={`/lists/${list.id}`}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  "hover:bg-accent/50",
                  isActive && "bg-accent text-accent-foreground font-medium",
                  collapsed && "justify-center px-0"
                )}
                aria-current={isActive ? "page" : undefined}
                title={collapsed ? list.name : undefined}
              >
                <span className="text-base shrink-0">{emoji}</span>
                {!collapsed && (
                  <span className="truncate">{list.name}</span>
                )}
              </Link>
            )
          })}

          {ownedLists.length === 0 && !collapsed && (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              No lists yet
            </p>
          )}
        </div>

        {/* Shared */}
        {sharedLists.length > 0 && (
          <div>
            {!collapsed && (
              <p className="px-2 pb-1 text-xs font-medium tracking-wider uppercase text-muted-foreground">
                Shared
              </p>
            )}
            {sharedLists.map((list) => {
              const emoji = getCategoryEmoji(list.category)
              const isActive = pathname === `/lists/${list.id}`
              return (
                <Link
                  key={list.id}
                  href={`/lists/${list.id}`}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    "hover:bg-accent/50",
                    isActive && "bg-accent text-accent-foreground font-medium",
                    collapsed && "justify-center px-0"
                  )}
                  aria-current={isActive ? "page" : undefined}
                  title={collapsed ? list.name : undefined}
                >
                  <span className="text-base shrink-0">{emoji}</span>
                  {!collapsed && (
                    <span className="truncate">{list.name}</span>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      {/* Bottom actions */}
      <div className="border-t border-border p-2 space-y-1">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Collapse
            </>
          )}
        </Button>

        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors",
            "hover:bg-accent/50",
            pathname === "/profile" && "bg-accent text-accent-foreground",
            collapsed && "justify-center px-0"
          )}
          aria-current={pathname === "/profile" ? "page" : undefined}
        >
          <Settings className="h-4 w-4" />
          {!collapsed && <span>Settings</span>}
        </Link>
      </div>
    </aside>
  )
}
