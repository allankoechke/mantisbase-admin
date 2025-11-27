"use client"

import * as React from "react"

export interface RouteParams {
  [key: string]: string
}

export interface ParsedRoute {
  path: string
  params: RouteParams
}

// Use a custom event system instead of relying on hash changes
const ROUTE_CHANGE_EVENT = "custom-route-change"

let currentRoute: ParsedRoute = { path: "/entities", params: {} }

export function parseRoute(hash: string): ParsedRoute {
  try {
    // Remove the # if present
    const cleanHash = hash.startsWith("#") ? hash.slice(1) : hash

    // If empty, default to /entities
    if (!cleanHash) {
      return { path: "/entities", params: {} }
    }

    // Split path and query string
    const [pathPart, queryPart] = cleanHash.split("?")

    // Parse query parameters
    const params: RouteParams = {}
    if (queryPart) {
      try {
        const searchParams = new URLSearchParams(queryPart)
        for (const [key, value] of searchParams.entries()) {
          params[key] = value
        }
      } catch (error) {
        console.warn("Failed to parse query parameters:", error)
      }
    }

    return {
      path: pathPart || "/entities",
      params,
    }
  } catch (error) {
    console.warn("Failed to parse route:", error)
    return { path: "/entities", params: {} }
  }
}

export function buildRoute(path: string, params?: RouteParams): string {
  try {
    let route = path.startsWith("/") ? path : `/${path}`

    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams()
      for (const [key, value] of Object.entries(params)) {
        if (value) {
          searchParams.set(key, value)
        }
      }
      const queryString = searchParams.toString()
      if (queryString) {
        route += `?${queryString}`
      }
    }

    return route
  } catch (error) {
    console.warn("Failed to build route:", error)
    return "/entities"
  }
}

// Custom event dispatcher
function dispatchRouteChange(route: ParsedRoute) {
  const event = new CustomEvent(ROUTE_CHANGE_EVENT, { detail: route })
  window.dispatchEvent(event)
}

export function useRouter() {
  const [route, setRoute] = React.useState<ParsedRoute>(() => {
    if (typeof window !== "undefined") {
      try {
        const initialRoute = parseRoute(window.location.hash)
        currentRoute = initialRoute
        return initialRoute
      } catch (error) {
        console.warn("Failed to get initial route:", error)
        return { path: "/entities", params: {} }
      }
    }
    return { path: "/entities", params: {} }
  })

  React.useEffect(() => {
    const handleCustomRouteChange = (event: CustomEvent) => {
      try {
        const newRoute = event.detail as ParsedRoute
        setRoute(newRoute)
        currentRoute = newRoute
      } catch (error) {
        console.warn("Failed to handle route change:", error)
      }
    }

    const handleHashChange = () => {
      try {
        const newRoute = parseRoute(window.location.hash)
        setRoute(newRoute)
        currentRoute = newRoute
      } catch (error) {
        console.warn("Failed to handle hash change:", error)
      }
    }

    const handlePopState = () => {
      try {
        const newRoute = parseRoute(window.location.hash)
        setRoute(newRoute)
        currentRoute = newRoute
      } catch (error) {
        console.warn("Failed to handle pop state:", error)
      }
    }

    // Listen for our custom events
    window.addEventListener(ROUTE_CHANGE_EVENT, handleCustomRouteChange as EventListener)

    // Still listen for hash changes for browser navigation
    window.addEventListener("hashchange", handleHashChange)
    window.addEventListener("popstate", handlePopState)

    return () => {
      window.removeEventListener(ROUTE_CHANGE_EVENT, handleCustomRouteChange as EventListener)
      window.removeEventListener("hashchange", handleHashChange)
      window.removeEventListener("popstate", handlePopState)
    }
  }, [])

  const navigate = React.useCallback((path: string, params?: RouteParams) => {
    try {
      const routePath = buildRoute(path, params)
      const newRoute: ParsedRoute = { path: routePath, params: params || {} }

      // Update URL without triggering hash change event
      const hashValue = `#${routePath}`

      // Use replaceState to avoid adding to history if it's the same route
      if (window.location.hash !== hashValue) {
        window.history.pushState(null, "", hashValue)
      }

      // Dispatch our custom event
      dispatchRouteChange(newRoute)
    } catch (error) {
      console.warn("Failed to navigate:", error)
    }
  }, [])

  return { route, navigate }
}

// Helper function to get current route without hooks
export function getCurrentRoute(): ParsedRoute {
  return currentRoute
}
