"use client"

import { useState } from "react"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"

type ListItem = {
  id: string
  name: string
  category: string | null
  role: string
}

type UserInfo = {
  name: string | null
  email: string
  avatar_url: string | null
}

type AppShellProps = {
  user: UserInfo
  ownedLists: ListItem[]
  sharedLists: ListItem[]
  children: React.ReactNode
}

export function AppShell({
  user,
  ownedLists,
  sharedLists,
  children,
}: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const allLists = [...ownedLists, ...sharedLists]

  return (
    <>
      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:top-2 focus:left-2 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>

      <div className="flex h-screen">
        {/* Desktop sidebar */}
        <Sidebar
          ownedLists={ownedLists}
          sharedLists={sharedLists}
        />

        {/* Mobile sidebar overlay */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <Sidebar
              ownedLists={ownedLists}
              sharedLists={sharedLists}
            />
          </SheetContent>
        </Sheet>

        {/* Main content area */}
        <div className="flex flex-1 flex-col min-w-0">
          <Header
            user={user}
            lists={allLists}
            onMenuToggle={() => setMobileMenuOpen(true)}
          />
          <main
            id="main-content"
            className="flex-1 overflow-y-auto pb-14 lg:pb-0"
          >
            {children}
          </main>
          <MobileNav />
        </div>
      </div>
    </>
  )
}
