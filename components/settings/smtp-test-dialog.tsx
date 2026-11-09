"use client"

import * as React from "react"
import { Mail } from "lucide-react"
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
  SYS_SETTINGS_SMTP_TEST_API,
  getApiClientError,
  type ApiClient,
  type SmtpTestResult,
} from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface SmtpTestDialogProps {
  open: boolean
  apiClient: ApiClient
  onClose: () => void
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function SmtpTestDialog({ open, apiClient, onClose }: SmtpTestDialogProps) {
  const { toast } = useToast()
  const [email, setEmail] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    if (open) {
      setEmail("")
      setError("")
    }
  }, [open])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const trimmed = email.trim()
    if (!trimmed || !isValidEmail(trimmed)) {
      setError("Enter a valid email address")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const result = await apiClient.call<SmtpTestResult>(SYS_SETTINGS_SMTP_TEST_API, {
        method: "POST",
        body: JSON.stringify({ email: trimmed }),
      })

      const apiError = getApiClientError(result)
      if (apiError) {
        throw new Error(apiError)
      }

      toast({
        title: "Test Email Sent",
        description: result?.message || `A test message was sent to ${trimmed}.`,
        duration: 5000,
      })
      onClose()
    } catch (submitError) {
      console.error("Failed to send SMTP test email:", submitError)
      setError(submitError instanceof Error ? submitError.message : "Failed to send test email")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Test Email
          </DialogTitle>
          <DialogDescription>
            Sends a message using the SMTP settings already saved on the server. Unsaved form changes are not used.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="smtp-test-email">Recipient email</Label>
            <Input
              id="smtp-test-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Limited to 3 test messages per recipient per hour.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send Test Email"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
