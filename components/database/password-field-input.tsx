"use client"

import * as React from "react"
import { Check, Copy, Eye, EyeOff, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { generateRandomPassword } from "@/lib/auth-fields"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface PasswordFieldInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
  placeholder?: string
}

export function PasswordFieldInput({
  id,
  value,
  onChange,
  disabled,
  className,
  placeholder = "Enter password or generate one",
}: PasswordFieldInputProps) {
  const { toast } = useToast()
  const [visible, setVisible] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  const handleGenerate = () => {
    const next = generateRandomPassword()
    onChange(next)
    setVisible(true)
    toast({
      title: "Password Generated",
      description: "A random password was filled in. Copy it before saving if you need to share it.",
      duration: 3000,
    })
  }

  const handleCopy = async () => {
    if (!value) {
      toast({
        variant: "destructive",
        title: "Nothing to copy",
        description: "Generate or enter a password first.",
      })
      return
    }

    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast({
        title: "Copied",
        description: "Password copied to clipboard.",
        duration: 2000,
      })
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      toast({
        variant: "destructive",
        title: "Copy failed",
        description: "Could not copy to clipboard.",
      })
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            id={id}
            type={visible ? "text" : "password"}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            className={cn("pr-10", className)}
            placeholder={placeholder}
            autoComplete="new-password"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
            onClick={() => setVisible((current) => !current)}
            disabled={disabled}
            aria-label={visible ? "Hide password" : "Show password"}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleGenerate} disabled={disabled}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Generate
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleCopy} disabled={disabled || !value}>
          {copied ? <Check className="mr-2 h-3.5 w-3.5" /> : <Copy className="mr-2 h-3.5 w-3.5" />}
          Copy
        </Button>
      </div>
    </div>
  )
}
