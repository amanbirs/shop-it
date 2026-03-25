"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { Sun, Moon, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"

const icons = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const

const nextTheme: Record<string, string> = {
  light: "dark",
  dark: "system",
  system: "light",
}

export function ThemeToggle() {
  const { theme = "system", setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true) // eslint-disable-line react-hooks/set-state-in-effect -- hydration guard
  }, [])

  const Icon = icons[theme as keyof typeof icons] ?? Monitor

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle theme"
        className="text-muted-foreground"
        disabled
      >
        <Monitor className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(nextTheme[theme] ?? "light")}
      aria-label={`Toggle theme (currently ${theme})`}
      className="text-muted-foreground"
    >
      <Icon className="h-4 w-4" />
    </Button>
  )
}
