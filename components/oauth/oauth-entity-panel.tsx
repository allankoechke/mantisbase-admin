"use client"

import * as React from "react"
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  SYS_OAUTH_ENTITY_CONFIG_API,
  SYS_OAUTH_PROVIDERS_API,
  SYS_SETTINGS_CONFIG_API,
  entityOAuthProvidersApi,
  extractListItems,
  getApiBaseUrl,
  getApiClientError,
  getOAuthProviderId,
  type ApiClient,
  type AppSettings,
  type EntityOAuthProvider,
  type OAuthEntityConfigResult,
  type OAuthProvider,
} from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { CreateOAuthProviderDialog } from "./create-oauth-provider-dialog"
import { EditOAuthProviderDialog } from "./edit-oauth-provider-dialog"

interface OAuthEntityPanelProps {
  entityName: string
  apiClient: ApiClient
  isActive: boolean
}

function isGloballyEnabled(provider: EntityOAuthProvider): boolean {
  return provider.enabled !== false
}

function isEnabledForEntity(provider: EntityOAuthProvider): boolean {
  return provider.enabled_for_entity === true
}

function toOAuthProvider(provider: EntityOAuthProvider): OAuthProvider {
  return {
    id: getOAuthProviderId(provider),
    name: provider.name,
    client_id: provider.client_id,
    enabled: provider.enabled,
  }
}

function updateProviderEntityEnabled(
  providers: EntityOAuthProvider[],
  providerId: string,
  enabledForEntity: boolean,
): EntityOAuthProvider[] {
  return providers.map((provider) =>
    getOAuthProviderId(provider) === providerId ? { ...provider, enabled_for_entity: enabledForEntity } : provider,
  )
}

export function OAuthEntityPanel({ entityName, apiClient, isActive }: OAuthEntityPanelProps) {
  const { toast } = useToast()
  const [providers, setProviders] = React.useState<EntityOAuthProvider[]>([])
  const [siteDomain, setSiteDomain] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [togglingProviderId, setTogglingProviderId] = React.useState<string | null>(null)
  const [creating, setCreating] = React.useState(false)
  const [editingProvider, setEditingProvider] = React.useState<OAuthProvider | null>(null)
  const [deletingProvider, setDeletingProvider] = React.useState<EntityOAuthProvider | null>(null)

  const loadOAuthConfig = React.useCallback(async () => {
    try {
      setIsLoading(true)

      const [providersResponse, settings] = await Promise.all([
        apiClient.call<unknown>(entityOAuthProvidersApi(entityName)),
        apiClient.call<AppSettings>(SYS_SETTINGS_CONFIG_API).catch(() => null),
      ])

      const providersError = getApiClientError(providersResponse)
      if (providersError) {
        throw new Error(providersError)
      }

      setProviders(extractListItems<EntityOAuthProvider>(providersResponse))

      if (settings?.siteDomain) {
        setSiteDomain(settings.siteDomain)
      }
    } catch (error) {
      console.error("Failed to load OAuth configuration:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load OAuth providers.",
      })
    } finally {
      setIsLoading(false)
    }
  }, [apiClient, entityName, toast])

  React.useEffect(() => {
    if (isActive) {
      loadOAuthConfig()
    }
  }, [isActive, loadOAuthConfig])

  const handleToggleProvider = async (provider: EntityOAuthProvider, enabled: boolean) => {
    const providerId = getOAuthProviderId(provider)
    if (!providerId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Provider ID is missing.",
      })
      return
    }

    setTogglingProviderId(providerId)

    try {
      const body = JSON.stringify({
        entity_name: entityName,
        provider_id: providerId,
      })

      const response = await apiClient.call<OAuthEntityConfigResult | null>(SYS_OAUTH_ENTITY_CONFIG_API, {
        method: enabled ? "POST" : "DELETE",
        body,
      })

      const error = getApiClientError(response)
      if (error) {
        if (!enabled && error.toLowerCase().includes("not found")) {
          setProviders((current) => updateProviderEntityEnabled(current, providerId, false))
          return
        }
        throw new Error(error)
      }

      setProviders((current) => updateProviderEntityEnabled(current, providerId, enabled))

      toast({
        title: enabled ? "OAuth Enabled" : "OAuth Disabled",
        description: `${provider.name} is ${enabled ? "enabled" : "disabled"} for ${entityName}.`,
      })
    } catch (error) {
      console.error("Failed to update OAuth entity config:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${enabled ? "enable" : "disable"} ${provider.name}.`,
      })
      await loadOAuthConfig()
    } finally {
      setTogglingProviderId(null)
    }
  }

  const handleProviderCreated = async (_provider: OAuthProvider) => {
    toast({
      title: "Provider Added",
      description: `"${_provider.name}" was registered. Enable it for this entity when ready.`,
    })
    await loadOAuthConfig()
  }

  const handleProviderUpdated = async (provider: OAuthProvider) => {
    toast({
      title: "Provider Updated",
      description: `"${provider.name}" settings were saved.`,
    })
    await loadOAuthConfig()
  }

  const handleDeleteProvider = async () => {
    if (!deletingProvider) {
      return
    }

    const providerId = getOAuthProviderId(deletingProvider)

    try {
      const response = await apiClient.call(`${SYS_OAUTH_PROVIDERS_API}/${providerId}`, {
        method: "DELETE",
      })

      const error = getApiClientError(response)
      if (error) {
        throw new Error(error)
      }

      toast({
        title: "Provider Removed",
        description: `"${deletingProvider.name}" was deleted from the global registry.`,
      })
      await loadOAuthConfig()
    } catch (error) {
      console.error("Failed to delete OAuth provider:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete OAuth provider.",
      })
    } finally {
      setDeletingProvider(null)
    }
  }

  const baseUrl = siteDomain || getApiBaseUrl()
  const callbackExample = `${baseUrl.replace(/\/+$/, "")}/api/v1/auth/${entityName}/oauth/callback/google`
  const enabledCount = providers.filter(isEnabledForEntity).length

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Label className="text-base font-medium">OAuth Providers</Label>
            <p className="text-sm text-muted-foreground">
              {isLoading && providers.length === 0
                ? "Loading OAuth configuration..."
                : `${enabledCount} of ${providers.length} provider${providers.length === 1 ? "" : "s"} enabled for this entity`}
            </p>
          </div>
          <Button size="sm" onClick={() => setCreating(true)} disabled={isLoading}>
            <Plus className="h-4 w-4 mr-2" />
            Add Provider
          </Button>
        </div>

        <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground space-y-2">
          <p>
            Register OAuth providers, then enable them for this auth entity. User login requires the provider to be
            globally enabled and enabled for this entity.
          </p>
          <p>
            Users sign in via{" "}
            <code className="bg-background px-1 rounded text-xs">/auth/{entityName}/oauth/authorize/{"{provider}"}</code>.
          </p>
          <p>
            <strong className="text-foreground">Callback URL pattern:</strong>{" "}
            <code className="bg-background px-1 rounded text-xs break-all">{callbackExample}</code>
          </p>
          {!siteDomain && (
            <p>
              Set <strong className="text-foreground">Site Domain</strong> in Settings for accurate OAuth redirect URLs
              in production.
            </p>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provider</TableHead>
              <TableHead>Client ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Enabled for entity</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && providers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Loading OAuth providers...
                </TableCell>
              </TableRow>
            ) : providers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No OAuth providers registered yet.
                </TableCell>
              </TableRow>
            ) : (
              providers.map((provider) => {
                const providerId = getOAuthProviderId(provider)
                const enabledForEntity = isEnabledForEntity(provider)
                const globallyEnabled = isGloballyEnabled(provider)
                const isToggling = togglingProviderId === providerId

                return (
                  <TableRow key={providerId || provider.name}>
                    <TableCell className="font-medium">{provider.name}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {typeof provider.client_id === "string" ? provider.client_id : "—"}
                    </TableCell>
                    <TableCell>
                      {globallyEnabled ? (
                        <Badge variant="secondary" className="text-xs">
                          Global
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Global off
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={enabledForEntity}
                        disabled={isToggling || isLoading || !providerId || !globallyEnabled}
                        onCheckedChange={(checked) => handleToggleProvider(provider, checked)}
                        aria-label={`Enable ${provider.name} for ${entityName}`}
                      />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingProvider(toOAuthProvider(provider))}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeletingProvider(provider)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CreateOAuthProviderDialog
        open={creating}
        apiClient={apiClient}
        onClose={() => setCreating(false)}
        onCreated={handleProviderCreated}
      />

      <EditOAuthProviderDialog
        open={!!editingProvider}
        provider={editingProvider}
        apiClient={apiClient}
        onClose={() => setEditingProvider(null)}
        onUpdated={handleProviderUpdated}
      />

      <AlertDialog open={!!deletingProvider} onOpenChange={(open) => !open && setDeletingProvider(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete OAuth Provider</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <span className="font-medium text-foreground">{deletingProvider?.name}</span> from the global
              registry? This removes it from all entities and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProvider}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
