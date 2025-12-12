"use client"

import * as React from "react"
import { FileText, ChevronDown, ChevronRight, X, Copy } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { TableMetadata } from "@/lib/api"

interface TableDocsDrawerProps {
  table: TableMetadata
  open: boolean
  onClose: () => void
}

// Generate docs based on user defined tables
export function TableRecordDocsDrawer({ table, open, onClose }: TableDocsDrawerProps) {
  const handleClose = () => {
    onClose()
  }

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent side="right" className="w-[1000px] max-w-[95vw]">
        <DrawerHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <DrawerTitle>API Documentation - {table.name}</DrawerTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DrawerDescription>Auto-generated API endpoints and examples</DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              <ApiEndpointCard
                method="GET"
                endpoint={`/api/v1/entities/${table.name}`}
                description={`List all records in the ${table.name} table`}
                table={table}
                operation="list"
              />

              <ApiEndpointCard
                method="GET"
                endpoint={`/api/v1/entities/${table.name}/{id}`}
                description="Get a specific record by ID"
                table={table}
                operation="get"
              />

              {table.schema.type !== "view" && (
                <>
                  <ApiEndpointCard
                    method="POST"
                    endpoint={`/api/v1/entities/${table.name}`}
                    description="Create a new record"
                    table={table}
                    operation="create"
                  />

                  <ApiEndpointCard
                    method="PATCH"
                    endpoint={`/api/v1/entities/${table.name}/{id}`}
                    description="Update a specific record"
                    table={table}
                    operation="update"
                  />

                  <ApiEndpointCard
                    method="DELETE"
                    endpoint={`/api/v1/entities/${table.name}/{id}`}
                    description="Delete a specific record"
                    table={table}
                    operation="delete"
                  />
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function ApiEndpointCard({
  method,
  endpoint,
  description,
  table,
  operation,
}: {
  method: string
  endpoint: string
  description: string
  table: TableMetadata
  operation: string
}) {
  const [isOpen, setIsOpen] = React.useState(false)

  const getMethodColor = (method: string) => {
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const generateRequestExample = () => {
    const baseUrl = "https://your-api.com"
    let example = `curl -X ${method} "${baseUrl}${endpoint}"`

    if (method !== "GET") {
      example += ` \\\n  -H "Content-Type: application/json"`
    }

    example += ` \\\n  -H "Authorization: Bearer YOUR_TOKEN"`

    if (operation === "create" || operation === "update") {
      const sampleData: any = {}
      table.schema.fields?.forEach((field) => {
        if (field.name === "id" || field.name === "created" || field.name === "updated") return
        if (field.name === "email") {
          sampleData[field.name] = "user@example.com"
        } else if (field.name === "password") {
          sampleData[field.name] = "securepassword"
        } else {
          sampleData[field.name] = `sample_${field.name}`
        }
      })

      example += ` \\\n  -d '${JSON.stringify(sampleData, null, 2)}'`
    }

    return example
  }

  const generateResponseExample = () => {
    if (operation === "list") {
      const sampleRecord: any = {}
      table.schema.fields?.forEach((field) => {
        if (field.name === "id") {
          sampleRecord[field.name] = "123e4567-e89b-12d3-a456-426614174000"
        } else if (field.name === "created" || field.name === "updated") {
          sampleRecord[field.name] = "2024-01-15T10:00:00Z"
        } else if (field.name === "email") {
          sampleRecord[field.name] = "user@example.com"
        } else if (field.name === "password") {
          return // Don't include password in response
        } else {
          sampleRecord[field.name] = `sample_${field.name}`
        }
      })

      return JSON.stringify(
        {
          data: [sampleRecord],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            pages: 1,
          },
        },
        null,
        2,
      )
    }

    if (operation === "delete") {
      return JSON.stringify({ success: true }, null, 2)
    }

    // Single record response
    const sampleRecord: any = {}
    table.schema.fields?.forEach((field) => {
      if (field.name === "id") {
        sampleRecord[field.name] = "123e4567-e89b-12d3-a456-426614174000"
      } else if (field.name === "created" || field.name === "updated") {
        sampleRecord[field.name] = "2024-01-15T10:00:00Z"
      } else if (field.name === "email") {
        sampleRecord[field.name] = "user@example.com"
      } else if (field.name === "password") {
        return // Don't include password in response
      } else {
        sampleRecord[field.name] = `sample_${field.name}`
      }
    })

    return JSON.stringify(sampleRecord, null, 2)
  }

  const requestExample = generateRequestExample()
  const responseExample = generateResponseExample()

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
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
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-l-2 border-muted ml-4 pl-6 space-y-6 mt-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-medium">Request Example</h5>
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(requestExample)} className="h-8">
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
            <ScrollArea className="h-48">
              <pre className="bg-muted p-4 rounded text-sm border">
                <code>{requestExample}</code>
              </pre>
            </ScrollArea>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-medium">Response Example</h5>
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(responseExample)} className="h-8">
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
            <ScrollArea className="h-48">
              <pre className="bg-muted p-4 rounded text-sm border">
                <code>{responseExample}</code>
              </pre>
            </ScrollArea>
          </div>

          <div>
            <h5 className="font-medium mb-3">Possible Errors</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="text-xs">
                  400
                </Badge>
                <span>Bad Request - Invalid input data</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="text-xs">
                  401
                </Badge>
                <span>Unauthorized - Invalid or missing token</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="text-xs">
                  403
                </Badge>
                <span>Forbidden - Access denied by rules</span>
              </div>
              {(operation === "get" || operation === "update" || operation === "delete") && (
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="text-xs">
                    404
                  </Badge>
                  <span>Not Found - Record does not exist</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="text-xs">
                  500
                </Badge>
                <span>Internal Server Error - Server error</span>
              </div>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
