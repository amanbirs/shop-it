"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
  PlusCircle,
  Sun,
  Moon,
  Settings,
  Search,
} from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"

type ListItem = {
  id: string
  name: string
  category: string | null
}

type CommandMenuProps = {
  lists?: ListItem[]
  onCreateList?: () => void
}

export function CommandMenu({ lists = [], onCreateList }: CommandMenuProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { setTheme, theme } = useTheme()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const navigate = useCallback(
    (path: string) => {
      setOpen(false)
      router.push(path)
    },
    [router]
  )

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground hover:bg-accent/50 transition-colors sm:w-64"
        aria-label="Search (⌘K)"
        aria-haspopup="dialog"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="ml-auto hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium sm:inline">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search lists, products..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {lists.length > 0 && (
            <CommandGroup heading="Lists">
              {lists.map((list) => (
                <CommandItem
                  key={list.id}
                  onSelect={() => navigate(`/lists/${list.id}`)}
                >
                  <span>{list.name}</span>
                  {list.category && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {list.category}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandSeparator />

          <CommandGroup heading="Actions">
            <CommandItem
              onSelect={() => {
                setOpen(false)
                onCreateList?.()
              }}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New List
            </CommandItem>
            <CommandItem
              onSelect={() =>
                setTheme(theme === "dark" ? "light" : "dark")
              }
            >
              {theme === "dark" ? (
                <Sun className="mr-2 h-4 w-4" />
              ) : (
                <Moon className="mr-2 h-4 w-4" />
              )}
              Toggle Theme
            </CommandItem>
            <CommandItem onSelect={() => navigate("/profile")}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
