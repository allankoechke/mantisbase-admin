"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { ApiClient, Admin } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface ChangePasswordDialogProps {
  admin: Admin
  apiClient: ApiClient
  onClose: () => void
}

export function ChangePasswordDialog({ admin, apiClient, onClose }: ChangePasswordDialogProps) {
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const res: any = await apiClient.call(`/api/v1/entities/mb_admins/${admin.id}`, {
        method: "PATCH",
        body: JSON.stringify({ password: newPassword }),
      })

      // If the request failed, throw the error here 
      if (res?.error?.length > 0) throw res.error

      onClose()

      toast({
        title: "Admin Updated",
        description: "Admin account password updated successfully!",
        duration: 3000,
      })
    } catch (error) {
      setError("Failed to change password")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Change Password</DialogTitle>
        <DialogDescription>Change password for {admin.email}</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div>
          <Label htmlFor="new-password">New Password</Label>
          <Input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="confirm-password">Confirm Password</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Changing..." : "Change Password"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
