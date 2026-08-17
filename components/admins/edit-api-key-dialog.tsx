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
  SYS_API_KEYS_API,
  type AdminApiKey,
  type ApiClient,
} from "@/lib/api"

interface EditApiKeyDialogProps {
  open: boolean
  apiKey: AdminApiKey | null
  apiClient: ApiClient
  onClose: () => void
  onUpdated: (updated: AdminApiKey) => void
}

function toDateTimeLocalValue(value: string | null): string {
  if (!value) {
    return ""
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ""
  }

  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

export function EditApiKeyDialog({
  open,
  apiKey,
  apiClient,
  onClose,
  onUpdated,
}: EditApiKeyDialogProps) {
  const [label, setLabel] = React.useState("")
  const [expiresAt, setExpiresAt] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    if (open && apiKey) {
      setLabel(apiKey.label)
      setExpiresAt(toDateTimeLocalValue(apiKey.expires_at))
      setError("")
    }
  }, [open, apiKey])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!apiKey) {
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const updated = await apiClient.call<AdminApiKey>(`${SYS_API_KEYS_API}/${apiKey.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          label: label.trim() || "API Key",
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : "",
        }),
      })

      onUpdated(updated)
      onClose()
    } catch (submitError) {
      console.error("Failed to update API key:", submitError)
      setError(submitError instanceof Error ? submitError.message : "Failed to update API key")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit API Key</DialogTitle>
          <DialogDescription>Update the label or expiration for this API key.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-api-key-label">Label</Label>
            <Input
              id="edit-api-key-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-api-key-expires">Expires At</Label>
            <Input
              id="edit-api-key-expires"
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
            <p className="text-sm text-muted-foreground">Leave blank for no expiration.</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
