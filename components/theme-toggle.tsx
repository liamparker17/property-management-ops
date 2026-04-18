"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"

const STORAGE_KEY = "pmops-theme"

function applyTheme(theme: "light" | "dark") {
  const root = document.documentElement
  root.classList.toggle("dark", theme === "dark")
  root.style.colorScheme = theme
}

export function ThemeToggle() {
  const [theme, setTheme] = React.useState<"light" | "dark">("light")
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as "light" | "dark" | null)
    const initial =
      saved ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    setTheme(initial)
    applyTheme(initial)
    setMounted(true)
  }, [])

  function toggle() {
    const next = theme === "dark" ? "light" : "dark"
    setTheme(next)
    applyTheme(next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="relative h-9 w-9"
    >
      {mounted ? (
        theme === "dark" ? (
          <Sun className="size-4" />
        ) : (
          <Moon className="size-4" />
        )
      ) : (
        <Moon className="size-4 opacity-0" />
      )}
    </Button>
  )
}
