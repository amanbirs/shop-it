"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, List, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const tabs = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/lists", icon: List, label: "Lists" },
  { href: "/profile", icon: Settings, label: "Settings" },
] as const

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 flex h-14 items-center justify-around border-t border-border bg-card pb-safe lg:hidden"
      aria-label="Main navigation"
    >
      {tabs.map((tab) => {
        const isActive =
          tab.href === "/"
            ? pathname === "/"
            : pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex flex-col items-center gap-0.5 text-xs transition-colors",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <tab.icon className="h-5 w-5" />
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
