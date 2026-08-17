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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  getApiClientError,
  type AdminApiKeyCreated,
  type ApiClient,
  type ApiKeyUser,
} from "@/lib/api"

interface CreateApiKeyDialogProps {
  open: boolean
  users: ApiKeyUser[]
  apiClient: ApiClient
  apiKeysApi: string
  defaultUserId?: string
  userFieldLabel?: string
  title?: string
  description?: string
  onClose: () => void
  onCreated: (created: AdminApiKeyCreated) => void
}

export function CreateApiKeyDialog({
  open,
  users,
  apiClient,
  apiKeysApi,
  defaultUserId,
  userFieldLabel = "User",
  title = "Create API Key",
  description = "Create a new API key linked to a user account.",
  onClose,
  onCreated,
}: CreateApiKeyDialogProps) {
  const [userId, setUserId] = React.useState(defaultUserId ?? "")
  const [label, setLabel] = React.useState(`api-key-${Date.now()}`)
  const [expiresAt, setExpiresAt] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    if (open) {
      setUserId(defaultUserId ?? users[0]?.id ?? "")
      setLabel(`api-key-${Date.now()}`)
      setExpiresAt("")
      setError("")
    }
  }, [open, defaultUserId, users])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!userId) {
      setError(`Select a ${userFieldLabel.toLowerCase()} for this API key`)
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const body: Record<string, unknown> = {
        user_id: userId,
        label: label.trim() || "API Key",
      }

      if (expiresAt) {
        body.expires_at = new Date(expiresAt).toISOString()
      }

      const created = await apiClient.call<AdminApiKeyCreated>(apiKeysApi, {
        method: "POST",
        body: JSON.stringify(body),
      })

      const apiError = getApiClientError(created)
      if (apiError) {
        throw new Error(apiError)
      }

      if (!created?.key) {
        throw new Error("API key was created but the secret was not returned")
      }

      onCreated({ ...created, user_id: created.user_id ?? userId })
      onClose()
    } catch (submitError) {
      console.error("Failed to create API key:", submitError)
      setError(submitError instanceof Error ? submitError.message : "Failed to create API key")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="api-key-user">{userFieldLabel}</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger id="api-key-user">
                <SelectValue placeholder={`Select ${userFieldLabel.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-key-label">Label</Label>
            <Input
              id="api-key-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Production automation"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-key-expires">Expires At (optional)</Label>
            <Input
              id="api-key-expires"
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || users.length === 0}>
              {isLoading ? "Creating..." : "Create API Key"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
