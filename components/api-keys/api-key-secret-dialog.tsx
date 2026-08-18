"use client"

import * as React from "react"
import { Check, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ApiKeySecretDialogProps {
  open: boolean
  label: string
  secret: string
  onClose: () => void
}

export function ApiKeySecretDialog({ open, label, secret, onClose }: ApiKeySecretDialogProps) {
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    if (!open) {
      setCopied(false)
    }
  }, [open])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(secret)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy API key:", error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>API Key Created</DialogTitle>
          <DialogDescription>
            Copy the key for <span className="font-medium text-foreground">{label}</span> now. It will not be shown again.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertDescription>
            Store this key securely. You will not be able to view it again after closing this dialog.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Input readOnly value={secret} className="font-mono text-sm" />
          <Button type="button" variant="outline" size="icon" onClick={handleCopy} aria-label="Copy API key">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
