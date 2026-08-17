"use client"

import * as React from "react"
import { AlertTriangle } from "lucide-react"
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useNavigate,
  useSearchParams,
} from "react-router-dom"
import { LoginForm } from "@/components/login-form"
import { SetupForm } from "@/components/setup-form"
import { AdminDashboard } from "@/components/admin-dashboard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Logo } from "@/components/logo"
import { AuthProvider, useAuth } from "@/lib/auth"
import { getBasePath, ROUTES } from "@/lib/routes"

function LoadingScreen({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}

function RequireAuth() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace />
  }

  return <Outlet />
}

function GuestOnly() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (isAuthenticated) {
    return <Navigate to={ROUTES.entities} replace />
  }

  return <Outlet />
}

function LoginRoute() {
  const { login } = useAuth()
  const navigate = useNavigate()

  return (
    <LoginForm
      onLogin={async (email, password) => {
        await login(email, password)
        navigate(ROUTES.entities, { replace: true })
      }}
    />
  )
}

function SetupRoute() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const setupToken = searchParams.get("token")

  if (!setupToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
              <Logo className="h-12 w-12 text-primary" size={48} />
            </div>
            <CardTitle className="text-2xl">Setup Access Required</CardTitle>
            <CardDescription>An access token is required to access the setup page</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Missing Access Token</AlertTitle>
              <AlertDescription>
                This page requires an access token in the query string (e.g. /setup?token=your-token-here).
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <SetupForm
      token={setupToken}
      onSetupComplete={() => navigate(ROUTES.login, { replace: true })}
    />
  )
}

function AppRoutesInner() {
  return (
    <Routes>
      <Route path={ROUTES.setup} element={<SetupRoute />} />

      <Route element={<GuestOnly />}>
        <Route path={ROUTES.login} element={<LoginRoute />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route path={ROUTES.home} element={<Navigate to={ROUTES.entities} replace />} />
        <Route path={ROUTES.entities} element={<AdminDashboard />} />
        <Route path={ROUTES.entityDetail} element={<AdminDashboard />} />
        <Route path={ROUTES.logs} element={<AdminDashboard />} />
        <Route path={ROUTES.admins} element={<AdminDashboard />} />
        <Route path={ROUTES.settings} element={<AdminDashboard />} />
      </Route>

      <Route path="*" element={<Navigate to={ROUTES.entities} replace />} />
    </Routes>
  )
}

export function AppRouterProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <LoadingScreen />
  }

  return (
    <BrowserRouter basename={getBasePath()}>
      <AuthProvider>{children}</AuthProvider>
    </BrowserRouter>
  )
}

export function AppRoutes() {
  return <AppRoutesInner />
}
