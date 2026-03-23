"use client"

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
  const Icon = icons[theme as keyof typeof icons] ?? Monitor

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
