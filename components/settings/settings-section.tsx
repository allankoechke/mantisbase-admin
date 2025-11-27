"use client"

import * as React from "react"
import { RefreshCw, TestTube, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import type { ApiClient, AppSettings } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useAppState, type AppMode } from "@/lib/app-state"

interface SettingsSectionProps {
  apiClient: ApiClient
  settings: AppSettings | null
  onSettingsUpdate: (settings: AppSettings) => void
  onModeChange: (mode: AppMode, baseUrl?: string) => void
}

export function SettingsSection({ apiClient, settings, onSettingsUpdate, onModeChange }: SettingsSectionProps) {
  const { toast } = useToast()
  const { mode, setMode } = useAppState()
  const [formData, setFormData] = React.useState<AppSettings | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [hasChanges, setHasChanges] = React.useState(false)
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  React.useEffect(() => {
    if (settings) {
      setFormData({ ...settings, mode })
      setHasChanges(false)
    }
  }, [settings, mode])

  const handleInputChange = (field: keyof AppSettings, value: any) => {
    if (!formData) return

    setFormData({
      ...formData,
      [field]: value,
    })
    setHasChanges(true)
  }

  const handleModeToggle = (newMode: AppMode) => {
    setMode(newMode)
    if (formData) {
      setFormData({
        ...formData,
        mode: newMode,
      })
      setHasChanges(true)
    }
    onModeChange(newMode, formData?.baseUrl)
  }

  const handleSave = async () => {
    if (!formData) return

    setIsLoading(true)
    try {
      const updatedSettings = await apiClient.call<AppSettings>("/api/v1/settings/config", {
        method: "PATCH",
        body: JSON.stringify(formData),
      })

      // If the request failed, throw the error here 
      if (updatedSettings?.error?.length > 0) throw updatedSettings.error

      onSettingsUpdate(updatedSettings)
      setHasChanges(false)

      toast({
        title: "Settings Saved",
        description: "Application settings have been updated successfully.",
        duration: 3000,
      })
    } catch (error) {
      console.error("Failed to update settings:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const updatedSettings = await apiClient.call<AppSettings>("/api/v1/settings/config")

      // If the request failed, throw the error here 
      if (updatedSettings?.error?.length > 0) throw updatedSettings.error

      onSettingsUpdate(updatedSettings)
    } catch (error) {
      console.error("Failed to refresh settings:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Show loading if we don't have formData yet
  if (!formData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your application configuration and preferences</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={mode === "TEST" ? "secondary" : "default"} className="flex items-center gap-1.5 px-3 py-1.5">
            {mode === "TEST" ? <TestTube className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
            {mode} Mode
          </Badge>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Settings Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
              <CardDescription>Basic application information and configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="app-name">Application Name</Label>
                  <Input
                    id="app-name"
                    value={formData?.appName || ""}
                    onChange={(e) => handleInputChange("appName", e.target.value)}
                    placeholder="My Application"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    value={formData?.mantisVersion || ""}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="base-url">Base URL</Label>
                <Input
                  id="base-url"
                  value={formData?.baseUrl || ""}
                  onChange={(e) => handleInputChange("baseUrl", e.target.value)}
                  placeholder="https://your-api-domain.com"
                />
                <p className="text-sm text-muted-foreground">
                  {mode === "PROD" 
                    ? "The base URL for your API endpoints in production mode"
                    : "Not used in test mode - API calls go to external server"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* File & Session Settings */}
          <Card>
            <CardHeader>
              <CardTitle>File & Sessions</CardTitle>
              <CardDescription>Configure file upload limits and session timeouts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="max-file-size">Max File Size (MB)</Label>
                  <Input
                    id="max-file-size"
                    type="number"
                    value={formData?.maxFileSize?.toString() || 10}
                    onChange={(e) => handleInputChange("maxFileSize", Number.parseInt(e.target.value) || 10)}
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session-timeout">Session Timeout (s)</Label>
                  <Input
                    id="session-timeout"
                    type="number"
                    value={formData?.sessionTimeout?.toString() || 86400}
                    onChange={(e) => handleInputChange("sessionTimeout", Number.parseInt(e.target.value) || 86400)}
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-session-timeout">Admin Session (s)</Label>
                  <Input
                    id="admin-session-timeout"
                    type="number"
                    value={formData?.adminSessionTimeout?.toString() || 3600}
                    onChange={(e) => handleInputChange("adminSessionTimeout", Number.parseInt(e.target.value) || 3600)}
                    min="1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feature Toggles */}
          <Card>
            <CardHeader>
              <CardTitle>Features</CardTitle>
              <CardDescription>Enable or disable application features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Temporarily disable access to the application
                  </p>
                </div>
                <Switch
                  checked={formData?.maintenanceMode || false}
                  onCheckedChange={(checked) => handleInputChange("maintenanceMode", checked)}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Allow Registration</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow new users to create accounts
                  </p>
                </div>
                <Switch
                  checked={formData?.allowRegistration || false}
                  onCheckedChange={(checked) => handleInputChange("allowRegistration", checked)}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Email Verification</Label>
                  <p className="text-sm text-muted-foreground">
                    Require email verification for new accounts
                  </p>
                </div>
                <Switch
                  checked={formData?.emailVerificationRequired || false}
                  onCheckedChange={(checked) => handleInputChange("emailVerificationRequired", checked)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Environment Mode Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Environment</CardTitle>
              <CardDescription>Switch between development and production modes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <button
                onClick={() => handleModeToggle("TEST")}
                className={`w-full text-left rounded-lg border-2 p-4 transition-all ${
                  mode === "TEST" 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <TestTube className="h-5 w-5 text-blue-600" />
                      <span className="font-semibold">Test Mode</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Development environment with CORS support
                    </p>
                  </div>
                  {mode === "TEST" && (
                    <Badge variant="default" className="ml-2">Active</Badge>
                  )}
                </div>
              </button>

              <button
                onClick={() => handleModeToggle("PROD")}
                className={`w-full text-left rounded-lg border-2 p-4 transition-all ${
                  mode === "PROD" 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-green-600" />
                      <span className="font-semibold">Production Mode</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Production environment on same server
                    </p>
                  </div>
                  {mode === "PROD" && (
                    <Badge variant="default" className="ml-2">Active</Badge>
                  )}
                </div>
              </button>

              {mode === "TEST" && (
                <div className="rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 p-4">
                  <div className="flex items-start gap-2">
                    <TestTube className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        Test Mode Active
                      </p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300">
                        API calls will be made to an external server. Ensure your API server is running and set MANTIS_PORT in environment variables.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={handleSave} 
                disabled={isLoading || !hasChanges}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (settings) {
                    setFormData({ ...settings, mode })
                    setHasChanges(false)
                  }
                }}
                disabled={!hasChanges}
                className="w-full"
                size="lg"
              >
                Reset Changes
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
