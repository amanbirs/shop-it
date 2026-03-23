"use client"

import { useRouter } from "next/navigation"
import { LogOut, User, Settings, Menu } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { ThemeToggle } from "@/components/common/theme-toggle"
import { CommandMenu } from "@/components/common/command-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type UserInfo = {
  name: string | null
  email: string
  avatar_url: string | null
}

type ListItem = {
  id: string
  name: string
  category: string | null
}

type HeaderProps = {
  user: UserInfo
  lists?: ListItem[]
  onCreateList?: () => void
  onMenuToggle?: () => void
}

export function Header({ user, lists, onCreateList, onMenuToggle }: HeaderProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email[0].toUpperCase()

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-muted-foreground"
          onClick={onMenuToggle}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Mobile logo */}
        <span className="text-lg font-semibold lg:hidden">ShopIt</span>

        {/* Command palette trigger */}
        <div className="hidden sm:block">
          <CommandMenu lists={lists} onCreateList={onCreateList} />
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* Mobile search */}
        <div className="sm:hidden">
          <CommandMenu lists={lists} onCreateList={onCreateList} />
        </div>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full cursor-pointer" aria-label="User menu">
            <Avatar className="h-7 w-7">
              <AvatarImage src={user.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              <p className="text-sm font-medium">{user.name || "User"}</p>
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
