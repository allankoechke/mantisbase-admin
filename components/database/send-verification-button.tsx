"use client"

import * as React from "react"
import { Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getApiClientError, type ApiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface SendVerificationButtonProps {
  entityName: string
  email: string | null | undefined
  apiClient: ApiClient
  variant?: "default" | "outline" | "ghost" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

export function SendVerificationButton({
  entityName,
  email,
  apiClient,
  variant = "outline",
  size = "sm",
  className,
}: SendVerificationButtonProps) {
  const { toast } = useToast()
  const [isSending, setIsSending] = React.useState(false)
  const trimmedEmail = typeof email === "string" ? email.trim() : ""

  const handleSend = async () => {
    if (!trimmedEmail) {
      toast({
        variant: "destructive",
        title: "Email required",
        description: "This user has no email address to send a verification link to.",
      })
      return
    }

    setIsSending(true)
    try {
      const response = await apiClient.call<{ sent?: boolean }>(
        `/api/v1/auth/${encodeURIComponent(entityName)}/verify-email/request`,
        {
          method: "POST",
          body: JSON.stringify({ email: trimmedEmail }),
        },
      )

      const error = getApiClientError(response)
      if (error) {
        throw new Error(error)
      }

      toast({
        title: "Verification Email Requested",
        description: "If an account exists for that email, we sent a verification link.",
        duration: 4000,
      })
    } catch (error) {
      console.error("Failed to send verification email:", error)
      toast({
        variant: "destructive",
        title: "Could not send verification",
        description: error instanceof Error ? error.message : "Failed to send verification email.",
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={handleSend}
      disabled={isSending || !trimmedEmail}
    >
      <Mail className="mr-2 h-3.5 w-3.5" />
      {isSending ? "Sending..." : "Send verification email"}
    </Button>
  )
}
