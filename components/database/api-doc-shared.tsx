"use client"

import * as React from "react"
import { ChevronDown, ChevronRight, Copy } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"

export function getMethodColor(method: string): string {
  switch (method) {
    case "GET":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    case "POST":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
    case "PATCH":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
    case "DELETE":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
  }
}

export function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text)
}

export function DocCodeBlock({
  code,
  height = "h-48",
}: {
  code: string
  height?: string
}) {
  return (
    <div>
      <div className="flex justify-end mb-2">
        <Button variant="outline" size="sm" onClick={() => copyToClipboard(code)} className="h-8">
          <Copy className="h-3 w-3 mr-1" />
          Copy
        </Button>
      </div>
      <ScrollArea className={height}>
        <pre className="bg-muted p-4 rounded text-sm border whitespace-pre">
          <code>{code}</code>
        </pre>
      </ScrollArea>
    </div>
  )
}

export function DocCollapsibleSection({
  title,
  description,
  icon,
  defaultOpen = false,
  children,
}: {
  title: React.ReactNode
  description?: string
  icon?: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {icon}
              <span className="font-medium">{title}</span>
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </div>
          </div>
          {description && <p className="text-sm text-muted-foreground mt-2">{description}</p>}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-l-2 border-muted ml-4 pl-6 space-y-6 mt-4">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function DocEndpointHeader({
  method,
  endpoint,
  description,
  isOpen,
}: {
  method: string
  endpoint: string
  description: string
  isOpen: boolean
}) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className={getMethodColor(method)} variant="secondary">
            {method}
          </Badge>
          <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{endpoint}</code>
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-2">{description}</p>
    </>
  )
}

export function DocErrorList({ errors }: { errors: Array<{ code: string; message: string }> }) {
  return (
    <div>
      <h5 className="font-medium mb-3">Possible Errors</h5>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        {errors.map((error) => (
          <div key={error.code} className="flex items-center gap-2">
            <Badge variant="destructive" className="text-xs">
              {error.code}
            </Badge>
            <span>{error.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DocSectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-2">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{children}</h3>
    </div>
  )
}

export function DocInfoBanner({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border bg-muted/30 p-4">{children}</div>
}
