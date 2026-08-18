"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  SYS_OAUTH_PROVIDERS_API,
  getApiClientError,
  type ApiClient,
  type OAuthProvider,
} from "@/lib/api"

interface EditOAuthProviderDialogProps {
  open: boolean
  provider: OAuthProvider | null
  apiClient: ApiClient
  onClose: () => void
  onUpdated: (provider: OAuthProvider) => void
}

export function EditOAuthProviderDialog({
  open,
  provider,
  apiClient,
  onClose,
  onUpdated,
}: EditOAuthProviderDialogProps) {
  const [name, setName] = React.useState("")
  const [clientId, setClientId] = React.useState("")
  const [clientSecret, setClientSecret] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    if (open && provider) {
      setName(provider.name ?? "")
      setClientId(typeof provider.client_id === "string" ? provider.client_id : "")
      setClientSecret("")
      setError("")
    }
  }, [open, provider])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!provider) {
      return
    }

    const trimmedName = name.trim()
    const trimmedClientId = clientId.trim()
    const trimmedSecret = clientSecret.trim()

    if (!trimmedName || !trimmedClientId) {
      setError("Name and client ID are required")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const body: Record<string, string> = {
        name: trimmedName,
        client_id: trimmedClientId,
      }

      if (trimmedSecret) {
        body.client_secret = trimmedSecret
      }

      const updated = await apiClient.call<OAuthProvider>(`${SYS_OAUTH_PROVIDERS_API}/${provider.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      })

      const apiError = getApiClientError(updated)
      if (apiError) {
        throw new Error(apiError)
      }

      onUpdated({ ...provider, ...updated, name: trimmedName, client_id: trimmedClientId })
      onClose()
    } catch (submitError) {
      console.error("Failed to update OAuth provider:", submitError)
      setError(submitError instanceof Error ? submitError.message : "Failed to update OAuth provider")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit OAuth Provider</DialogTitle>
          <DialogDescription>Update provider credentials. Leave client secret blank to keep the current value.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-oauth-provider-name">Provider name</Label>
            <Input
              id="edit-oauth-provider-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-oauth-client-id">Client ID</Label>
            <Input
              id="edit-oauth-client-id"
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-oauth-client-secret">Client secret</Label>
            <Input
              id="edit-oauth-client-secret"
              type="password"
              value={clientSecret}
              onChange={(event) => setClientSecret(event.target.value)}
              placeholder="Leave blank to keep current secret"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !provider}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
