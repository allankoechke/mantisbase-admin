"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { SidebarMenuButton } from "@/components/ui/sidebar"

interface ThemeToggleProps {
  iconOnly?: boolean
}

export function ThemeToggle({ iconOnly = false }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <SidebarMenuButton className={iconOnly ? "h-12 w-full justify-center p-0 mx-0 rounded-none min-w-full" : ""}>
        <div className="h-6 w-6" />
        {!iconOnly && <span>Theme</span>}
      </SidebarMenuButton>
    )
  }

  const toggleTheme = () => {
    // Always toggle between light and dark explicitly
    const currentResolved = resolvedTheme || "light"
    const newTheme = currentResolved === "dark" ? "light" : "dark"
    setTheme(newTheme)
  }

  const displayTheme = resolvedTheme || "light"

  return (
    <SidebarMenuButton onClick={toggleTheme} className={iconOnly ? "h-12 w-full justify-center p-0 mx-0 rounded-none min-w-full" : ""}>
      {displayTheme === "dark" ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
      {!iconOnly && <span>{displayTheme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
      {iconOnly && <span className="sr-only">{displayTheme === "dark" ? "Switch to Light" : "Switch to Dark"}</span>}
    </SidebarMenuButton>
  )
}
