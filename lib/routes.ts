"use client"

/** Admin dashboard route paths (without basePath). */
export const ROUTES = {
  home: "/",
  login: "/login",
  setup: "/setup",
  entities: "/entities",
  entityDetail: "/entities/:name",
  logs: "/logs",
  admins: "/admins",
  settings: "/settings",
} as const

export type DashboardSection = "entities" | "logs" | "admins" | "settings" | "sync"

const DASHBOARD_SECTIONS = new Set<string>(["entities", "logs", "admins", "settings", "sync"])

function getDefaultBasePath(): string {
  return process.env.NODE_ENV === "production" ? "/mb" : ""
}

/** Application base path (e.g. `/mb` in production). */
export function getBasePath(): string {
  if (typeof process.env.NEXT_PUBLIC_BASE_PATH !== "undefined") {
    return process.env.NEXT_PUBLIC_BASE_PATH
  }

  if (typeof window !== "undefined") {
    const pathname = window.location.pathname
    if (pathname === "/mb" || pathname.startsWith("/mb/")) {
      return "/mb"
    }
  }

  return getDefaultBasePath()
}

export function entityDetailPath(name: string): string {
  return `/entities/${encodeURIComponent(name)}`
}

export function getDashboardSection(pathname: string): DashboardSection {
  const segment = pathname.split("/").filter(Boolean)[0] || "entities"
  if (DASHBOARD_SECTIONS.has(segment)) {
    return segment as DashboardSection
  }
  return "entities"
}
