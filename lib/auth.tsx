"use client"

import * as React from "react"
import { checkAuthSession, loginWithPassword, logoutSession, type Admin } from "@/lib/api"

interface AuthContextValue {
  isAuthenticated: boolean
  isLoading: boolean
  user: Admin | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshSession: () => Promise<boolean>
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [user, setUser] = React.useState<Admin | null>(null)

  const refreshSession = React.useCallback(async (): Promise<boolean> => {
    const authenticated = await checkAuthSession()
    setIsAuthenticated(authenticated)
    if (!authenticated) {
      setUser(null)
    }
    return authenticated
  }, [])

  React.useEffect(() => {
    let cancelled = false

    const bootstrap = async () => {
      try {
        const authenticated = await checkAuthSession()
        if (!cancelled) {
          setIsAuthenticated(authenticated)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    bootstrap()

    return () => {
      cancelled = true
    }
  }, [])

  const login = React.useCallback(async (email: string, password: string) => {
    const result = await loginWithPassword(email, password)
    const authenticated = await checkAuthSession()
    if (!authenticated) {
      throw new Error(
        "Login succeeded but the session cookie was not established. Ensure the admin UI and API share the same origin.",
      )
    }
    setUser(result.user)
    setIsAuthenticated(true)
  }, [])

  const logout = React.useCallback(async () => {
    await logoutSession()
    setUser(null)
    setIsAuthenticated(false)
  }, [])

  const value = React.useMemo(
    () => ({
      isAuthenticated,
      isLoading,
      user,
      login,
      logout,
      refreshSession,
    }),
    [isAuthenticated, isLoading, user, login, logout, refreshSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
