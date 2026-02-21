"use client"

import * as React from "react"
import { Eye, EyeOff, Info } from "lucide-react"
import { Logo } from "./logo"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { loginWithPassword } from "@/lib/api"

const DEMO_EMAIL = "test@test.com"
const DEMO_PASSWORD = "123456789"

function isDemoMode(): boolean {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_MB_IS_DEMO_MODE === "true" || process.env.NEXT_PUBLIC_MB_IS_DEMO_MODE === "1"
  }
  return process.env.NEXT_PUBLIC_MB_IS_DEMO_MODE === "true" || process.env.NEXT_PUBLIC_MB_IS_DEMO_MODE === "1"
}

interface LoginFormProps {
  onLogin: (token: string) => void
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const isDemo = isDemoMode()
  const [email, setEmail] = React.useState(isDemo ? DEMO_EMAIL : "")
  const [password, setPassword] = React.useState(isDemo ? DEMO_PASSWORD : "")
  const [showPassword, setShowPassword] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const data = await loginWithPassword(email, password)
      localStorage.setItem("admin_token", data.token)
      onLogin(data.token)
    } catch (err: any) {
      setError(err.message || "Invalid email or password")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {isDemo && (
        <Alert className="rounded-none border-x-0 border-t-0 bg-amber-500/10 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200 border-amber-500/30">
          <Info className="h-4 w-4" />
          <AlertDescription className="font-medium">
            This is a demo site. Data is cleared every 30 minutes. Default login: {DEMO_EMAIL} / {DEMO_PASSWORD}
          </AlertDescription>
        </Alert>
      )}
      <div className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Logo className="h-12 w-12 text-primary" size={48} />
          </div>
          <CardTitle className="text-2xl">Mantis Admin</CardTitle>
          <CardDescription>Sign in to access the admin dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>

          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
