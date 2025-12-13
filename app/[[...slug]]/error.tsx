"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  React.useEffect(() => {
    // Log the error to an error reporting service
    console.error("Route error:", error)
  }, [error])

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-md">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="text-muted-foreground">
          {error.message || "An unexpected error occurred"}
        </p>
        <Button onClick={reset} variant="default">
          Try again
        </Button>
      </div>
    </div>
  )
}

