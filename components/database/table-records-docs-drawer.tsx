"use client"

import * as React from "react"
import { FileText, ChevronDown, ChevronRight, X, Copy, Radio } from "lucide-react"

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
              <DrawerTitle>API Documentation - {table.schema.name}</DrawerTitle>
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
                endpoint={`/api/v1/entities/${table.schema.name}`}
                description={`List all records in the ${table.schema.name} table`}
                table={table}
                operation="list"
              />

              <ApiEndpointCard
                method="GET"
                endpoint={`/api/v1/entities/${table.schema.name}/{id}`}
                description="Get a specific record by ID"
                table={table}
                operation="get"
              />

              {table.schema.type !== "view" && (
                <>
                  <ApiEndpointCard
                    method="POST"
                    endpoint={`/api/v1/entities/${table.schema.name}`}
                    description="Create a new record"
                    table={table}
                    operation="create"
                  />

                  <ApiEndpointCard
                    method="PATCH"
                    endpoint={`/api/v1/entities/${table.schema.name}/{id}`}
                    description="Update a specific record"
                    table={table}
                    operation="update"
                  />

                  <ApiEndpointCard
                    method="DELETE"
                    endpoint={`/api/v1/entities/${table.schema.name}/{id}`}
                    description="Delete a specific record"
                    table={table}
                    operation="delete"
                  />
                </>
              )}

              <RealtimeDocCard table={table} />
            </div>
          </ScrollArea>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

// Realtime (SSE) documentation: connect and update topics for this entity
function RealtimeDocCard({ table }: { table: TableMetadata }) {
  const [isOpen, setIsOpen] = React.useState(false)
  const entityName = table.schema.name
  const baseUrl = "https://your-api.com"
  const sampleRowId = "019c1b81-364b-7000-8120-b5416b2c42c2"

  const connectExample = `# Connect to SSE: subscribe to this entity (all rows) and/or a specific row
# Topics: entity name only, or entity:row_id for a single row
curl -N -H "Authorization: Bearer YOUR_TOKEN" \\
  "${baseUrl}/api/v1/realtime?topics=${entityName}"

# Subscribe to entity + a specific row (comma-separated)
curl -N -H "Authorization: Bearer YOUR_TOKEN" \\
  "${baseUrl}/api/v1/realtime?topics=${entityName},${entityName}:${sampleRowId}"`

  const updateTopicsExample = `# Update topics for an existing SSE session (from the "connected" event client_id)
curl -X POST "${baseUrl}/api/v1/realtime" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
  "client_id": "sse_1769987962000_0abc1",
  "topics": ["${entityName}", "${entityName}:${sampleRowId}"]
}'

# Clear topics to disconnect
curl -X POST "${baseUrl}/api/v1/realtime" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"client_id": "sse_1769987962000_0abc1", "topics": []}'`

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Radio className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Realtime (SSE)</span>
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Subscribe to database changes for this entity (all rows) or a specific row. Connect via GET, then update topics via POST.
          </p>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-l-2 border-muted ml-4 pl-6 space-y-6 mt-4">
          <div>
            <h5 className="font-medium mb-1">Connect to SSE</h5>
            <p className="text-sm text-muted-foreground mb-2">
              Open a long-lived SSE stream. Use <code className="bg-muted px-1 rounded">topics</code> query param: entity name (e.g. <code className="bg-muted px-1 rounded">{entityName}</code>) for all rows, or <code className="bg-muted px-1 rounded">{entityName}:row_id</code> for a single row. Multiple topics are comma-separated.
            </p>
            <div className="flex justify-end mb-2">
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(connectExample)} className="h-8">
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
            <ScrollArea className="h-40">
              <pre className="bg-muted p-4 rounded text-sm border whitespace-pre">
                <code>{connectExample}</code>
              </pre>
            </ScrollArea>
          </div>
          <div>
            <h5 className="font-medium mb-1">Update topics to monitor</h5>
            <p className="text-sm text-muted-foreground mb-2">
              POST with <code className="bg-muted px-1 rounded">client_id</code> from the <code className="bg-muted px-1 rounded">connected</code> event and a new <code className="bg-muted px-1 rounded">topics</code> array. Send <code className="bg-muted px-1 rounded">topics: []</code> to disconnect.
            </p>
            <div className="flex justify-end mb-2">
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(updateTopicsExample)} className="h-8">
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
            <ScrollArea className="h-48">
              <pre className="bg-muted p-4 rounded text-sm border whitespace-pre">
                <code>{updateTopicsExample}</code>
              </pre>
            </ScrollArea>
          </div>
          <div>
            <h5 className="font-medium mb-2">SSE event types</h5>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">connected</Badge>
                <span>Sent once when the stream opens; includes <code className="bg-muted px-1 rounded">client_id</code> and <code className="bg-muted px-1 rounded">topics</code>.</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">ping</Badge>
                <span>Keep-alive sent periodically.</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">change</Badge>
                <span>Database change: <code className="bg-muted px-1 rounded">action</code> (insert/update/delete), <code className="bg-muted px-1 rounded">entity</code>, <code className="bg-muted px-1 rounded">row_id</code>, <code className="bg-muted px-1 rounded">data</code> (row payload or null for delete).</span>
              </div>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>
              Access uses the same rules as entity <strong>list</strong> (topic = entity name) and <strong>get</strong> (topic = entity:row_id). In browsers, <code className="bg-muted px-1 rounded">EventSource</code> cannot send <code className="bg-muted px-1 rounded">Authorization</code>; use <code className="bg-muted px-1 rounded">fetch()</code> with the same URL and headers, then read the body as a stream to process SSE events.
            </p>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
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
