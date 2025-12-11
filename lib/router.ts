"use client"

import * as React from "react"

export interface RouteParams {
  [key: string]: string
}

export interface ParsedRoute {
  path: string
  pathParams: RouteParams
  queryParams: RouteParams
}

// Use a custom event system for route changes
const ROUTE_CHANGE_EVENT = "custom-route-change"

let currentRoute: ParsedRoute = { path: "/entities", pathParams: {}, queryParams: {} }

// Get the base path for the application
// In production, this should be '/mb-admin', in development it might be empty
export function getBasePath(): string {
  if (typeof window === "undefined") {
    // Server-side: use env var or default to /mb-admin for production
    return process.env.NEXT_PUBLIC_BASE_PATH || (process.env.NODE_ENV === 'production' ? '/mb-admin' : '')
  }
  
  // Client-side: try to detect base path from current location
  // If we're at /mb-admin/*, the base path is /mb-admin
  const pathname = window.location.pathname
  if (pathname.startsWith("/mb-admin")) {
    return "/mb-admin"
  }
  
  // Fallback: check if we're in production mode
  // In development, base path might be empty
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_BASE_PATH || "/mb-admin"
  }
  
  // Development: no base path
  return process.env.NEXT_PUBLIC_BASE_PATH || ""
}

// Strip base path from a full pathname
function stripBasePath(pathname: string): string {
  const basePath = getBasePath()
  if (pathname.startsWith(basePath)) {
    return pathname.slice(basePath.length) || "/"
  }
  return pathname
}

// Parse path params from route pattern (e.g., "/entities/:name" -> { name: "test" })
function parsePathParams(pattern: string, path: string): RouteParams {
  const params: RouteParams = {}
  const patternParts = pattern.split("/")
  const pathParts = path.split("/")

  if (patternParts.length !== pathParts.length) {
    return params
  }

  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(":")) {
      const paramName = patternParts[i].slice(1)
      params[paramName] = pathParts[i]
    }
  }

  return params
}

export function parseRoute(pathname: string, search: string = ""): ParsedRoute {
  try {
    // Strip base path from the pathname first
    const pathWithoutBase = stripBasePath(pathname)
    
    // Remove leading slash if present for consistency
    let cleanPath = pathWithoutBase.startsWith("/") ? pathWithoutBase : `/${pathWithoutBase}`
    
    // Remove trailing slash for consistency
    if (cleanPath.endsWith("/") && cleanPath !== "/") {
      cleanPath = cleanPath.slice(0, -1)
    }

    // If empty, default to /entities
    if (!cleanPath || cleanPath === "/") {
      return { path: "/entities", pathParams: {}, queryParams: {} }
    }

    // Parse query parameters from search string
    const queryParams: RouteParams = {}
    if (search) {
      try {
        const searchParams = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
        for (const [key, value] of searchParams.entries()) {
          queryParams[key] = value
        }
      } catch (error) {
        console.warn("Failed to parse query parameters:", error)
      }
    }

    // Extract path params based on known route patterns
    const pathParams: RouteParams = {}
    
    // Match /entities/:name pattern
    const entitiesMatch = cleanPath.match(/^\/entities\/([^/]+)$/)
    if (entitiesMatch) {
      pathParams.name = entitiesMatch[1]
      return { path: "/entities/:name", pathParams, queryParams }
    }

    return {
      path: cleanPath,
      pathParams,
      queryParams,
    }
  } catch (error) {
    console.warn("Failed to parse route:", error)
    return { path: "/entities", pathParams: {}, queryParams: {} }
  }
}

export function buildRoute(path: string, pathParams?: RouteParams, queryParams?: RouteParams): string {
  try {
    let route = path.startsWith("/") ? path : `/${path}`

    // Replace path params (e.g., /entities/:name -> /entities/test)
    if (pathParams) {
      for (const [key, value] of Object.entries(pathParams)) {
        route = route.replace(`:${key}`, value)
      }
    }

    // Add query parameters
    if (queryParams && Object.keys(queryParams).length > 0) {
      const searchParams = new URLSearchParams()
      for (const [key, value] of Object.entries(queryParams)) {
        if (value) {
          searchParams.set(key, value)
        }
      }
      const queryString = searchParams.toString()
      if (queryString) {
        route += `?${queryString}`
      }
    }

    // Prepend base path
    const basePath = getBasePath()
    return basePath + route
  } catch (error) {
    console.warn("Failed to build route:", error)
    const basePath = getBasePath()
    return basePath + "/entities"
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
        const initialRoute = parseRoute(window.location.pathname, window.location.search)
        currentRoute = initialRoute
        return initialRoute
      } catch (error) {
        console.warn("Failed to get initial route:", error)
        return { path: "/entities", pathParams: {}, queryParams: {} }
      }
    }
    return { path: "/entities", pathParams: {}, queryParams: {} }
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

    const handlePopState = () => {
      try {
        const newRoute = parseRoute(window.location.pathname, window.location.search)
        setRoute(newRoute)
        currentRoute = newRoute
      } catch (error) {
        console.warn("Failed to handle pop state:", error)
      }
    }

    // Listen for our custom events
    window.addEventListener(ROUTE_CHANGE_EVENT, handleCustomRouteChange as EventListener)
    window.addEventListener("popstate", handlePopState)

    return () => {
      window.removeEventListener(ROUTE_CHANGE_EVENT, handleCustomRouteChange as EventListener)
      window.removeEventListener("popstate", handlePopState)
    }
  }, [])

  const navigate = React.useCallback((path: string, pathParams?: RouteParams, queryParams?: RouteParams) => {
    try {
      const routePath = buildRoute(path, pathParams, queryParams)
      const newRoute = parseRoute(routePath.split("?")[0], routePath.includes("?") ? routePath.split("?")[1] : "")

      // Update URL using pushState for clean paths
      if (window.location.pathname + window.location.search !== routePath) {
        window.history.pushState(null, "", routePath)
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
