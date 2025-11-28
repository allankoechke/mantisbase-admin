"use client"

import * as React from "react"
import { RefreshCw, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
  const [originalData, setOriginalData] = React.useState<AppSettings | null>(null)
  const [isLoading, setIsLoading] = React.useState<Record<string, boolean>>({})
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  React.useEffect(() => {
    if (settings) {
      const data = { ...settings, mode }
      setFormData(data)
      setOriginalData(data)
    }
  }, [settings, mode])

  // Track changes per card section
  const getCardChanges = (cardType: "general" | "file" | "features"): boolean => {
    if (!formData || !originalData) return false
    
    if (cardType === "general") {
      return (
        formData.appName !== originalData.appName ||
        formData.baseUrl !== originalData.baseUrl
      )
    }
    
    if (cardType === "file") {
      return (
        formData.maxFileSize !== originalData.maxFileSize ||
        formData.sessionTimeout !== originalData.sessionTimeout ||
        formData.adminSessionTimeout !== originalData.adminSessionTimeout
      )
    }
    
    if (cardType === "features") {
      return (
        formData.maintenanceMode !== originalData.maintenanceMode ||
        formData.allowRegistration !== originalData.allowRegistration ||
        formData.emailVerificationRequired !== originalData.emailVerificationRequired
      )
    }
    
    return false
  }

  const resetCardChanges = (cardType: "general" | "file" | "features") => {
    if (!formData || !originalData) return
    
    if (cardType === "general") {
      setFormData({
        ...formData,
        appName: originalData.appName,
        baseUrl: originalData.baseUrl,
      })
    }
    
    if (cardType === "file") {
      setFormData({
        ...formData,
        maxFileSize: originalData.maxFileSize,
        sessionTimeout: originalData.sessionTimeout,
        adminSessionTimeout: originalData.adminSessionTimeout,
      })
    }
    
    if (cardType === "features") {
      setFormData({
        ...formData,
        maintenanceMode: originalData.maintenanceMode,
        allowRegistration: originalData.allowRegistration,
        emailVerificationRequired: originalData.emailVerificationRequired,
      })
    }
  }

  const handleInputChange = (field: keyof AppSettings, value: any) => {
    if (!formData) return

    setFormData({
      ...formData,
      [field]: value,
    })
  }

  const handleSave = async (cardType: "general" | "file" | "features") => {
    if (!formData) return

    setIsLoading({ ...isLoading, [cardType]: true })
    try {
      const updatedSettings = await apiClient.call<AppSettings>("/api/v1/settings/config", {
        method: "PATCH",
        body: JSON.stringify(formData),
      })

      // If the request failed, throw the error here 
      if (updatedSettings?.error?.length > 0) throw updatedSettings.error

      const data = { ...updatedSettings, mode }
      setFormData(data)
      setOriginalData(data)
      onSettingsUpdate(updatedSettings)

      toast({
        title: "Settings Saved",
        description: `${cardType.charAt(0).toUpperCase() + cardType.slice(1)} settings have been updated successfully.`,
        duration: 3000,
      })
    } catch (error) {
      console.error("Failed to update settings:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save settings. Please try again.",
      })
    } finally {
      setIsLoading({ ...isLoading, [cardType]: false })
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
        <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="space-y-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>General</CardTitle>
                <CardDescription>Basic application information and configuration</CardDescription>
              </div>
              {getCardChanges("general") && (
                <Button
                  size="sm"
                  onClick={() => handleSave("general")}
                  disabled={isLoading.general}
                  className="gap-2"
                >
                  {isLoading.general ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save
                    </>
                  )}
                </Button>
              )}
            </div>
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>File & Sessions</CardTitle>
                <CardDescription>Configure file upload limits and session timeouts</CardDescription>
              </div>
              {getCardChanges("file") && (
                <Button
                  size="sm"
                  onClick={() => handleSave("file")}
                  disabled={isLoading.file}
                  className="gap-2"
                >
                  {isLoading.file ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save
                    </>
                  )}
                </Button>
              )}
            </div>
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Features</CardTitle>
                <CardDescription>Enable or disable application features</CardDescription>
              </div>
              {getCardChanges("features") && (
                <Button
                  size="sm"
                  onClick={() => handleSave("features")}
                  disabled={isLoading.features}
                  className="gap-2"
                >
                  {isLoading.features ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save
                    </>
                  )}
                </Button>
              )}
            </div>
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
    </div>
  )
}
