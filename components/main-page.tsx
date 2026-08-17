"use client"

import * as React from "react"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import { AppStateProvider } from "@/lib/app-state"
import { AppRouterProvider, AppRoutes } from "@/components/app-routes"

export default function MainPage() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem storageKey="mantis-admin-theme" disableTransitionOnChange>
      <AppStateProvider>
        <AppRouterProvider>
          <AppRoutes />
        </AppRouterProvider>
        <Toaster />
      </AppStateProvider>
    </ThemeProvider>
  )
}
