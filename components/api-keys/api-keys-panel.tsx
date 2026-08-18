"use client"

import * as React from "react"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  extractListItems,
  getApiClientError,
  type AdminApiKey,
  type AdminApiKeyCreated,
  type ApiClient,
  type ApiKeyUser,
} from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { ApiKeySecretDialog } from "./api-key-secret-dialog"
import { CreateApiKeyDialog } from "./create-api-key-dialog"
import { EditApiKeyDialog } from "./edit-api-key-dialog"

interface ApiKeysPanelProps {
  users: ApiKeyUser[]
  apiClient: ApiClient
  apiKeysApi: string
  cacheKey: string
  isActive: boolean
  defaultUserId?: string
  createRequested?: boolean
  reloadRequested?: number
  supportsEdit?: boolean
  panelTitle?: string
  userColumnLabel?: string
  createDialogTitle?: string
  createDialogDescription?: string
  userFieldLabel?: string
  onCreateRequestHandled?: () => void
  onLoadingChange?: (loading: boolean) => void
}

function formatDate(value: string | null): string {
  if (!value) {
    return "Never"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

function getUserLabel(users: ApiKeyUser[], userId: string): string {
  return users.find((user) => user.id === userId)?.label ?? userId
}

function toCachedApiKey(key: AdminApiKey | AdminApiKeyCreated): AdminApiKey {
  const { key: _secret, ...metadata } = key as AdminApiKeyCreated
  return metadata
}

function readCachedApiKeys(cacheKey: string): AdminApiKey[] {
  if (typeof window === "undefined") {
    return []
  }

  try {
    const raw = sessionStorage.getItem(cacheKey)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)
    return extractListItems<AdminApiKey>(parsed)
  } catch {
    return []
  }
}

function writeCachedApiKeys(cacheKey: string, keys: AdminApiKey[]): void {
  if (typeof window === "undefined") {
    return
  }

  sessionStorage.setItem(cacheKey, JSON.stringify(keys))
}

function mergeApiKeys(fetched: AdminApiKey[], cached: AdminApiKey[]): AdminApiKey[] {
  if (fetched.length > 0) {
    return fetched
  }

  return cached
}

export function ApiKeysPanel({
  users,
  apiClient,
  apiKeysApi,
  cacheKey,
  isActive,
  defaultUserId,
  createRequested,
  reloadRequested = 0,
  supportsEdit = true,
  panelTitle = "API Keys",
  userColumnLabel = "User",
  createDialogTitle,
  createDialogDescription,
  userFieldLabel,
  onCreateRequestHandled,
  onLoadingChange,
}: ApiKeysPanelProps) {
  const { toast } = useToast()
  const [apiKeys, setApiKeys] = React.useState<AdminApiKey[]>(() => readCachedApiKeys(cacheKey))
  const [isLoading, setIsLoading] = React.useState(false)
  const [creating, setCreating] = React.useState(false)
  const [selectedUserId, setSelectedUserId] = React.useState<string | undefined>()
  const [editingKey, setEditingKey] = React.useState<AdminApiKey | null>(null)
  const [deletingKey, setDeletingKey] = React.useState<AdminApiKey | null>(null)
  const [createdSecret, setCreatedSecret] = React.useState<{ label: string; secret: string } | null>(null)
  const hasLoadedRef = React.useRef(false)

  const persistApiKeys = React.useCallback(
    (keys: AdminApiKey[]) => {
      setApiKeys(keys)
      writeCachedApiKeys(cacheKey, keys)
    },
    [cacheKey],
  )

  const loadApiKeys = React.useCallback(async () => {
    const cached = readCachedApiKeys(cacheKey)

    try {
      setIsLoading(true)
      onLoadingChange?.(true)

      const response = await apiClient.call<unknown>(apiKeysApi)
      const error = getApiClientError(response)
      if (error) {
        throw new Error(error)
      }

      const fetched = extractListItems<AdminApiKey>(response)
      const merged = mergeApiKeys(fetched, cached)
      persistApiKeys(merged)
      hasLoadedRef.current = true
    } catch (error) {
      console.error("Failed to load API keys:", error)

      if (cached.length > 0) {
        setApiKeys(cached)
      }

      toast({
        variant: "destructive",
        title: "Error",
        description: hasLoadedRef.current
          ? "Failed to refresh API keys."
          : cached.length > 0
            ? "Could not refresh API keys from the server. Showing cached keys from this browser session."
            : "Failed to load API keys.",
      })
    } finally {
      setIsLoading(false)
      onLoadingChange?.(false)
    }
  }, [apiClient, apiKeysApi, cacheKey, onLoadingChange, persistApiKeys, toast])

  React.useEffect(() => {
    if (isActive) {
      loadApiKeys()
    }
  }, [isActive, loadApiKeys])

  React.useEffect(() => {
    if (isActive && reloadRequested > 0) {
      loadApiKeys()
    }
  }, [isActive, reloadRequested, loadApiKeys])

  React.useEffect(() => {
    if (createRequested) {
      setSelectedUserId(defaultUserId)
      setCreating(true)
      onCreateRequestHandled?.()
    }
  }, [createRequested, defaultUserId, onCreateRequestHandled])

  const handleCreated = (created: AdminApiKeyCreated) => {
    const metadata = toCachedApiKey(created)
    setApiKeys((current) => {
      const next = [metadata, ...current.filter((key) => key.id !== metadata.id)]
      writeCachedApiKeys(cacheKey, next)
      return next
    })
    setCreatedSecret({ label: created.label, secret: created.key })
    toast({
      title: "API Key Created",
      description: "Copy the key now. It will not be shown again.",
    })
  }

  const handleUpdated = (updated: AdminApiKey) => {
    setApiKeys((current) => {
      const next = current.map((key) => (key.id === updated.id ? updated : key))
      writeCachedApiKeys(cacheKey, next)
      return next
    })
    toast({
      title: "API Key Updated",
      description: "API key settings were saved.",
    })
  }

  const handleDelete = async () => {
    if (!deletingKey) {
      return
    }

    try {
      const response = await apiClient.call(`${apiKeysApi}/${deletingKey.id}`, { method: "DELETE" })
      const error = getApiClientError(response)
      if (error) {
        throw new Error(error)
      }

      setApiKeys((current) => {
        const next = current.filter((key) => key.id !== deletingKey.id)
        writeCachedApiKeys(cacheKey, next)
        return next
      })
      toast({
        title: "API Key Revoked",
        description: `"${deletingKey.label}" has been deleted.`,
      })
    } catch (error) {
      console.error("Failed to delete API key:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete API key.",
      })
    } finally {
      setDeletingKey(null)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{panelTitle}</CardTitle>
          <CardDescription>
            {isLoading && apiKeys.length === 0
              ? "Loading API keys..."
              : `${apiKeys.length} API key${apiKeys.length === 1 ? "" : "s"}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>{userColumnLabel}</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && apiKeys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Loading API keys...
                  </TableCell>
                </TableRow>
              ) : apiKeys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No API keys yet.
                  </TableCell>
                </TableRow>
              ) : (
                apiKeys.map((apiKey) => (
                  <TableRow key={apiKey.id}>
                    <TableCell className="font-medium">{apiKey.label}</TableCell>
                    <TableCell>{getUserLabel(users, apiKey.user_id)}</TableCell>
                    <TableCell>{formatDate(apiKey.created)}</TableCell>
                    <TableCell>{formatDate(apiKey.last_used)}</TableCell>
                    <TableCell>{apiKey.expires_at ? formatDate(apiKey.expires_at) : "Never"}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {supportsEdit && (
                            <DropdownMenuItem onClick={() => setEditingKey(apiKey)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeletingKey(apiKey)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CreateApiKeyDialog
        open={creating}
        users={users}
        apiClient={apiClient}
        apiKeysApi={apiKeysApi}
        defaultUserId={selectedUserId}
        userFieldLabel={userFieldLabel ?? userColumnLabel}
        title={createDialogTitle}
        description={createDialogDescription}
        onClose={() => setCreating(false)}
        onCreated={handleCreated}
      />

      {supportsEdit && (
        <EditApiKeyDialog
          open={!!editingKey}
          apiKey={editingKey}
          apiClient={apiClient}
          apiKeysApi={apiKeysApi}
          onClose={() => setEditingKey(null)}
          onUpdated={handleUpdated}
        />
      )}

      <ApiKeySecretDialog
        open={!!createdSecret}
        label={createdSecret?.label ?? ""}
        secret={createdSecret?.secret ?? ""}
        onClose={() => setCreatedSecret(null)}
      />

      <AlertDialog open={!!deletingKey} onOpenChange={(open) => !open && setDeletingKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Revoke <span className="font-medium text-foreground">{deletingKey?.label}</span>? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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

export function openCreateApiKeyDialog(
  setDefaultUserId: (userId: string | undefined) => void,
  setCreateRequested: (requested: boolean) => void,
  userId?: string,
) {
  setDefaultUserId(userId)
  setCreateRequested(true)
}
