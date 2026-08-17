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
  SYS_API_KEYS_API,
  getApiClientError,
  type Admin,
  type AdminApiKeyCreated,
  type ApiClient,
} from "@/lib/api"

interface CreateApiKeyDialogProps {
  open: boolean
  admins: Admin[]
  apiClient: ApiClient
  defaultAdminId?: string
  onClose: () => void
  onCreated: (created: AdminApiKeyCreated) => void
}

export function CreateApiKeyDialog({
  open,
  admins,
  apiClient,
  defaultAdminId,
  onClose,
  onCreated,
}: CreateApiKeyDialogProps) {
  const [adminId, setAdminId] = React.useState(defaultAdminId ?? "")
  const [label, setLabel] = React.useState(`api-key-${Date.now()}`)
  const [expiresAt, setExpiresAt] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    if (open) {
      setAdminId(defaultAdminId ?? admins[0]?.id ?? "")
      setLabel(`api-key-${Date.now()}`)
      setExpiresAt("")
      setError("")
    }
  }, [open, defaultAdminId, admins])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!adminId) {
      setError("Select an admin account for this API key")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const body: Record<string, unknown> = {
        user_id: adminId,
        label: label.trim() || "API Key",
      }

      if (expiresAt) {
        body.expires_at = new Date(expiresAt).toISOString()
      }

      const created = await apiClient.call<AdminApiKeyCreated>(SYS_API_KEYS_API, {
        method: "POST",
        body: JSON.stringify(body),
      })

      const error = getApiClientError(created)
      if (error) {
        throw new Error(error)
      }

      if (!created?.key) {
        throw new Error("API key was created but the secret was not returned")
      }

      onCreated({ ...created, user_id: created.user_id ?? adminId })
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
          <DialogTitle>Create API Key</DialogTitle>
          <DialogDescription>Create a new API key linked to an admin account.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="api-key-admin">Admin Account</Label>
            <Select value={adminId} onValueChange={setAdminId}>
              <SelectTrigger id="api-key-admin">
                <SelectValue placeholder="Select admin" />
              </SelectTrigger>
              <SelectContent>
                {admins.map((admin) => (
                  <SelectItem key={admin.id} value={admin.id}>
                    {admin.email}
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
            <Button type="submit" disabled={isLoading || admins.length === 0}>
              {isLoading ? "Creating..." : "Create API Key"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
