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

interface CreateOAuthProviderDialogProps {
  open: boolean
  apiClient: ApiClient
  onClose: () => void
  onCreated: (provider: OAuthProvider) => void
}

export function CreateOAuthProviderDialog({
  open,
  apiClient,
  onClose,
  onCreated,
}: CreateOAuthProviderDialogProps) {
  const [name, setName] = React.useState("")
  const [clientId, setClientId] = React.useState("")
  const [clientSecret, setClientSecret] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    if (open) {
      setName("")
      setClientId("")
      setClientSecret("")
      setError("")
    }
  }, [open])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const trimmedName = name.trim()
    const trimmedClientId = clientId.trim()
    const trimmedSecret = clientSecret.trim()

    if (!trimmedName || !trimmedClientId || !trimmedSecret) {
      setError("Name, client ID, and client secret are required")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const created = await apiClient.call<OAuthProvider>(SYS_OAUTH_PROVIDERS_API, {
        method: "POST",
        body: JSON.stringify({
          name: trimmedName,
          client_id: trimmedClientId,
          client_secret: trimmedSecret,
        }),
      })

      const apiError = getApiClientError(created)
      if (apiError) {
        throw new Error(apiError)
      }

      if (!created?.id) {
        throw new Error("Provider was created but no ID was returned")
      }

      onCreated(created)
      onClose()
    } catch (submitError) {
      console.error("Failed to create OAuth provider:", submitError)
      setError(submitError instanceof Error ? submitError.message : "Failed to create OAuth provider")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add OAuth Provider</DialogTitle>
          <DialogDescription>
            Register a global OAuth provider. Enable it for this entity after creation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="oauth-provider-name">Provider name</Label>
            <Input
              id="oauth-provider-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="google"
              required
            />
            <p className="text-xs text-muted-foreground">
              Used in OAuth routes as <code className="bg-muted px-1 rounded">{`{provider}`}</code> (e.g. google,
              github).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="oauth-client-id">Client ID</Label>
            <Input
              id="oauth-client-id"
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
              placeholder="your-client-id"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="oauth-client-secret">Client secret</Label>
            <Input
              id="oauth-client-secret"
              type="password"
              value={clientSecret}
              onChange={(event) => setClientSecret(event.target.value)}
              placeholder="your-client-secret"
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Add Provider"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
