"use client"

import * as React from "react"
import { RefreshCw, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  SYS_SETTINGS_CONFIG_API,
  type ApiClient,
  type AppSettings,
  type SmtpConfig,
} from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface SettingsSectionProps {
  apiClient: ApiClient
}

type SettingsCard = "general" | "file" | "features" | "smtp"

const BYTES_PER_MB = 1024 * 1024

function corsOriginsToText(origins: string[]): string {
  return origins.join("\n")
}

function textToCorsOrigins(text: string): string[] {
  return text.split("\n").map((line) => line.trim()).filter(Boolean)
}

function smtpEqual(a: SmtpConfig, b: SmtpConfig, ignorePassword = false): boolean {
  return (
    a.host === b.host &&
    a.port === b.port &&
    a.user === b.user &&
    a.from === b.from &&
    a.tls === b.tls &&
    (ignorePassword || a.password === b.password)
  )
}

export function SettingsSection({ apiClient }: SettingsSectionProps) {
  const { toast } = useToast()
  const [formData, setFormData] = React.useState<AppSettings | null>(null)
  const [originalData, setOriginalData] = React.useState<AppSettings | null>(null)
  const [corsOriginsText, setCorsOriginsText] = React.useState("")
  const [originalCorsOriginsText, setOriginalCorsOriginsText] = React.useState("")
  const [isLoading, setIsLoading] = React.useState<Record<string, boolean>>({})
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [isBootstrapping, setIsBootstrapping] = React.useState(true)

  const applySettings = React.useCallback((settings: AppSettings) => {
    const normalized: AppSettings = {
      ...settings,
      corsAllowedOrigins: settings.corsAllowedOrigins ?? [],
      smtp: {
        host: "",
        port: 587,
        user: "",
        password: "",
        from: "",
        tls: true,
        ...settings.smtp,
      },
    }
    const corsText = corsOriginsToText(normalized.corsAllowedOrigins)
    setFormData(normalized)
    setOriginalData(normalized)
    setCorsOriginsText(corsText)
    setOriginalCorsOriginsText(corsText)
  }, [])

  const loadSettings = React.useCallback(async () => {
    const settings = await apiClient.call<AppSettings>(SYS_SETTINGS_CONFIG_API)
    applySettings(settings)
    return settings
  }, [apiClient, applySettings])

  React.useEffect(() => {
    let cancelled = false

    const bootstrap = async () => {
      try {
        await loadSettings()
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load settings:", error)
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load settings. Please try again.",
          })
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false)
        }
      }
    }

    bootstrap()

    return () => {
      cancelled = true
    }
  }, [loadSettings, toast])

  const getCardChanges = (cardType: SettingsCard): boolean => {
    if (!formData || !originalData) return false

    if (cardType === "general") {
      return (
        formData.orgName !== originalData.orgName ||
        formData.siteDomain !== originalData.siteDomain ||
        corsOriginsText !== originalCorsOriginsText
      )
    }

    if (cardType === "file") {
      return (
        formData.maxFileSize !== originalData.maxFileSize ||
        formData.logRetentionDays !== originalData.logRetentionDays ||
        formData.sessionTimeout !== originalData.sessionTimeout ||
        formData.adminSessionTimeout !== originalData.adminSessionTimeout
      )
    }

    if (cardType === "features") {
      return (
        formData.disableAdminRegistration !== originalData.disableAdminRegistration ||
        formData.disableSchemaMutations !== originalData.disableSchemaMutations ||
        formData.emailVerificationRequired !== originalData.emailVerificationRequired ||
        formData.jwtEnableSetIssuer !== originalData.jwtEnableSetIssuer ||
        formData.jwtEnableSetAudience !== originalData.jwtEnableSetAudience
      )
    }

    if (cardType === "smtp") {
      return !smtpEqual(formData.smtp, originalData.smtp)
    }

    return false
  }

  const buildPatchPayload = (cardType: SettingsCard): Partial<AppSettings> => {
    if (!formData) return {}

    if (cardType === "general") {
      return {
        orgName: formData.orgName,
        siteDomain: formData.siteDomain,
        corsAllowedOrigins: textToCorsOrigins(corsOriginsText),
      }
    }

    if (cardType === "file") {
      return {
        maxFileSize: formData.maxFileSize,
        logRetentionDays: formData.logRetentionDays,
        sessionTimeout: formData.sessionTimeout,
        adminSessionTimeout: formData.adminSessionTimeout,
      }
    }

    if (cardType === "features") {
      return {
        disableAdminRegistration: formData.disableAdminRegistration,
        disableSchemaMutations: formData.disableSchemaMutations,
        emailVerificationRequired: formData.emailVerificationRequired,
        jwtEnableSetIssuer: formData.jwtEnableSetIssuer,
        jwtEnableSetAudience: formData.jwtEnableSetAudience,
      }
    }

    const smtpPatch: Partial<SmtpConfig> = {
      host: formData.smtp.host,
      port: formData.smtp.port,
      user: formData.smtp.user,
      from: formData.smtp.from,
      tls: formData.smtp.tls,
    }

    if (formData.smtp.password.length > 0) {
      smtpPatch.password = formData.smtp.password
    }

    return { smtp: smtpPatch as SmtpConfig }
  }

  const handleInputChange = <K extends keyof AppSettings>(field: K, value: AppSettings[K]) => {
    if (!formData) return
    setFormData({ ...formData, [field]: value })
  }

  const handleSmtpChange = <K extends keyof SmtpConfig>(field: K, value: SmtpConfig[K]) => {
    if (!formData) return
    setFormData({
      ...formData,
      smtp: { ...formData.smtp, [field]: value },
    })
  }

  const handleSave = async (cardType: SettingsCard) => {
    if (!formData) return

    setIsLoading((prev) => ({ ...prev, [cardType]: true }))
    try {
      const updatedSettings = await apiClient.call<AppSettings>(SYS_SETTINGS_CONFIG_API, {
        method: "PATCH",
        body: JSON.stringify(buildPatchPayload(cardType)),
      })

      applySettings(updatedSettings)

      toast({
        title: "Settings Saved",
        description: `${cardType.charAt(0).toUpperCase()}${cardType.slice(1)} settings have been updated successfully.`,
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
      setIsLoading((prev) => ({ ...prev, [cardType]: false }))
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await loadSettings()
    } catch (error) {
      console.error("Failed to refresh settings:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to refresh settings. Please try again.",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const renderSaveButton = (cardType: SettingsCard) => {
    if (!getCardChanges(cardType)) return null

    return (
      <Button
        size="sm"
        onClick={() => handleSave(cardType)}
        disabled={isLoading[cardType]}
        className="gap-2"
      >
        {isLoading[cardType] ? (
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
    )
  }

  if (isBootstrapping || !formData) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-6">
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
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>General</CardTitle>
                <CardDescription>Organization details, public site URL, and CORS origins</CardDescription>
              </div>
              {renderSaveButton("general")}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  value={formData.orgName}
                  onChange={(e) => handleInputChange("orgName", e.target.value)}
                  placeholder="ACME Corp"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="site-domain">Site Domain</Label>
                <Input
                  id="site-domain"
                  value={formData.siteDomain}
                  onChange={(e) => handleInputChange("siteDomain", e.target.value)}
                  placeholder="https://acme.example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cors-origins">CORS Allowed Origins</Label>
              <Textarea
                id="cors-origins"
                value={corsOriginsText}
                onChange={(e) => setCorsOriginsText(e.target.value)}
                placeholder={"http://localhost:3000\nhttp://127.0.0.1:3000"}
                rows={4}
              />
              <p className="text-sm text-muted-foreground">Enter one origin per line.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>File & Sessions</CardTitle>
                <CardDescription>Upload limits, log retention, and session timeouts</CardDescription>
              </div>
              {renderSaveButton("file")}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="max-file-size">Max File Size (MB)</Label>
                <Input
                  id="max-file-size"
                  type="number"
                  value={Math.round(formData.maxFileSize / BYTES_PER_MB)}
                  onChange={(e) =>
                    handleInputChange(
                      "maxFileSize",
                      (Number.parseInt(e.target.value, 10) || 1) * BYTES_PER_MB,
                    )
                  }
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="log-retention-days">Log Retention (days)</Label>
                <Input
                  id="log-retention-days"
                  type="number"
                  value={formData.logRetentionDays}
                  onChange={(e) =>
                    handleInputChange("logRetentionDays", Number.parseInt(e.target.value, 10) || 1)
                  }
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="session-timeout">Session Timeout (s)</Label>
                <Input
                  id="session-timeout"
                  type="number"
                  value={formData.sessionTimeout}
                  onChange={(e) =>
                    handleInputChange("sessionTimeout", Number.parseInt(e.target.value, 10) || 1)
                  }
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-session-timeout">Admin Session (s)</Label>
                <Input
                  id="admin-session-timeout"
                  type="number"
                  value={formData.adminSessionTimeout}
                  onChange={(e) =>
                    handleInputChange("adminSessionTimeout", Number.parseInt(e.target.value, 10) || 1)
                  }
                  min="1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Features</CardTitle>
                <CardDescription>Registration, schema changes, email verification, and JWT options</CardDescription>
              </div>
              {renderSaveButton("features")}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">Disable Admin Registration</Label>
                <p className="text-sm text-muted-foreground">Prevent creation of new admin accounts</p>
              </div>
              <Switch
                checked={formData.disableAdminRegistration}
                onCheckedChange={(checked) => handleInputChange("disableAdminRegistration", checked)}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">Disable Schema Mutations</Label>
                <p className="text-sm text-muted-foreground">Block create, update, and delete operations on schemas</p>
              </div>
              <Switch
                checked={formData.disableSchemaMutations}
                onCheckedChange={(checked) => handleInputChange("disableSchemaMutations", checked)}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">Email Verification Required</Label>
                <p className="text-sm text-muted-foreground">Require email verification for new accounts</p>
              </div>
              <Switch
                checked={formData.emailVerificationRequired}
                onCheckedChange={(checked) => handleInputChange("emailVerificationRequired", checked)}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">JWT Set Issuer</Label>
                <p className="text-sm text-muted-foreground">Include issuer claim when signing JWTs</p>
              </div>
              <Switch
                checked={formData.jwtEnableSetIssuer}
                onCheckedChange={(checked) => handleInputChange("jwtEnableSetIssuer", checked)}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">JWT Set Audience</Label>
                <p className="text-sm text-muted-foreground">Include audience claim when signing JWTs</p>
              </div>
              <Switch
                checked={formData.jwtEnableSetAudience}
                onCheckedChange={(checked) => handleInputChange("jwtEnableSetAudience", checked)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>SMTP</CardTitle>
                <CardDescription>Outbound email delivery configuration</CardDescription>
              </div>
              {renderSaveButton("smtp")}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="smtp-host">Host</Label>
                <Input
                  id="smtp-host"
                  value={formData.smtp.host}
                  onChange={(e) => handleSmtpChange("host", e.target.value)}
                  placeholder="smtp.example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-port">Port</Label>
                <Input
                  id="smtp-port"
                  type="number"
                  value={formData.smtp.port}
                  onChange={(e) => handleSmtpChange("port", Number.parseInt(e.target.value, 10) || 587)}
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-user">Username</Label>
                <Input
                  id="smtp-user"
                  value={formData.smtp.user}
                  onChange={(e) => handleSmtpChange("user", e.target.value)}
                  placeholder="smtp-user"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-password">Password</Label>
                <Input
                  id="smtp-password"
                  type="password"
                  value={formData.smtp.password}
                  onChange={(e) => handleSmtpChange("password", e.target.value)}
                  placeholder="Leave blank to keep current password"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="smtp-from">From Address</Label>
                <Input
                  id="smtp-from"
                  value={formData.smtp.from}
                  onChange={(e) => handleSmtpChange("from", e.target.value)}
                  placeholder="noreply@example.com"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">Use TLS</Label>
                <p className="text-sm text-muted-foreground">Enable TLS for SMTP connections</p>
              </div>
              <Switch
                checked={formData.smtp.tls}
                onCheckedChange={(checked) => handleSmtpChange("tls", checked)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
