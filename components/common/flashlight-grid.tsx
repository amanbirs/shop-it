"use client"

import { useRef, useCallback } from "react"

type FlashlightGridProps = {
  children: React.ReactNode
  className?: string
}

/**
 * Wraps a grid with a cursor-tracking radial glow effect.
 * Follows the mouse and applies a subtle border glow on nearby cards.
 * Desktop only — no effect on touch devices.
 * See 06-pages.md § Flashlight Effect for spec.
 */
export function FlashlightGrid({ children, className }: FlashlightGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    container.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`)
    container.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`)
  }, [])

  const handleMouseLeave = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    container.style.setProperty("--mouse-x", "-1000px")
    container.style.setProperty("--mouse-y", "-1000px")
  }, [])

  return (
    <div
      ref={containerRef}
      className={`relative ${className ?? ""}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={
        {
          "--mouse-x": "-1000px",
          "--mouse-y": "-1000px",
        } as React.CSSProperties
      }
    >
      {/* Flashlight overlay — pointer-events-none so clicks pass through */}
      <div
        className="pointer-events-none absolute inset-0 z-10 hidden lg:block opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), oklch(0.541 0.281 293.009 / 0.06), transparent 40%)",
        }}
      />
      {children}
    </div>
  )
}
