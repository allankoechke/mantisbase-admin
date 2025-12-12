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
  open: boolean
  onClose: () => void
}

// Generate docs for entity schema management API
export function TableDocsDrawer({ open, onClose }: TableDocsDrawerProps) {
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
              <DrawerTitle>Entity Schema API Documentation</DrawerTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DrawerDescription>
            API endpoints for managing entity schemas. All endpoints require admin authentication token.
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              <div className="rounded-lg border bg-muted/30 p-4 mb-4">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Note:</strong> All endpoints require an admin authentication token in the Authorization header:
                  <code className="ml-2 px-2 py-1 bg-background rounded text-xs">Authorization: Bearer YOUR_ADMIN_TOKEN</code>
                </p>
              </div>

              <ApiEndpointCard
                method="GET"
                endpoint={`/api/v1/schemas`}
                description="List all entity schemas"
                operation="list"
              />

              <ApiEndpointCard
                method="GET"
                endpoint={`/api/v1/schemas/{ENTITY_SCHEMA_NAME_OR_ID}`}
                description="Get a specific entity schema by name or ID"
                operation="get"
              />

              <ApiEndpointCard
                method="POST"
                endpoint={`/api/v1/schemas`}
                description="Create a new entity schema"
                operation="create"
              />

              <ApiEndpointCard
                method="PATCH"
                endpoint={`/api/v1/schemas/{ENTITY_SCHEMA_NAME_OR_ID}`}
                description="Update an existing entity schema"
                operation="update"
              />

              <ApiEndpointCard
                method="DELETE"
                endpoint={`/api/v1/schemas/{ENTITY_SCHEMA_NAME_OR_ID}`}
                description="Delete an entity schema"
                operation="delete"
              />
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
  operation,
}: {
  method: string
  endpoint: string
  description: string
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
    const baseUrl = "{{MANTISBASE_BASE_URL}}"
    let example = `curl -X ${method} "${baseUrl}${endpoint}"`

    example += ` \\\n  -H "Content-Type: application/json"`
    example += ` \\\n  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"`

    if (operation === "create") {
      const sampleSchema = {
        name: "example_entity",
        type: "base",
        schema: {
          fields: [
            {
              name: "title",
              type: "string",
              primary_key: false,
              required: true,
              system: false,
              unique: false,
              constraints: {
                default_value: null,
                max_value: null,
                min_value: null,
                validator: null
              }
            }
          ],
          rules: {
            add: { expr: "", mode: "auth" },
            delete: { expr: "", mode: "auth" },
            get: { expr: "", mode: "auth" },
            list: { expr: "", mode: "auth" },
            update: { expr: "", mode: "auth" }
          }
        }
        // For view types, also include: view_query: "CREATE VIEW ... AS SELECT ..."
      }
      example += ` \\\n  -d '${JSON.stringify(sampleSchema, null, 2)}'`
    } else if (operation === "update") {
      const sampleUpdate = {
        name: "updated_entity_name",
        schema: {
          fields: [
            {
              id: "mbf_existing_field_id",
              name: "updated_field_name",
              type: "string",
              primary_key: false,
              required: true,
              system: false,
              unique: false,
              constraints: {
                default_value: null,
                max_value: null,
                min_value: null,
                validator: null
              }
            },
            {
              name: "new_field",
              type: "string",
              primary_key: false,
              required: false,
              system: false,
              unique: false,
              constraints: {
                default_value: null,
                max_value: null,
                min_value: null,
                validator: null
              }
            },
            {
              id: "mbf_field_to_delete",
              op: "delete"
            }
          ]
        }
      }
      example += ` \\\n  -d '${JSON.stringify(sampleUpdate, null, 2)}'`
    }

    return example
  }

  const generateResponseExample = () => {
    if (operation === "list") {
      // List schemas - NOT paginated, returns direct array
      return JSON.stringify(
        {
          data: [
            {
              created: "2025-12-05 02:08:06",
              id: "mbt_7691163245302450708",
              schema: {
                fields: [
                  {
                    constraints: {
                      default_value: null,
                      max_value: null,
                      min_value: null,
                      validator: "@password"
                    },
                    id: "mbf_14258576900392064537",
                    name: "id",
                    primary_key: true,
                    required: true,
                    system: true,
                    type: "string",
                    unique: false
                  },
                  {
                    constraints: {
                      default_value: null,
                      max_value: null,
                      min_value: null,
                      validator: null
                    },
                    id: "mbf_13735287961322938256",
                    name: "created",
                    primary_key: false,
                    required: true,
                    system: true,
                    type: "date",
                    unique: false
                  },
                  {
                    constraints: {
                      default_value: null,
                      max_value: null,
                      min_value: null,
                      validator: null
                    },
                    id: "mbf_9124719522053273721",
                    name: "updated",
                    primary_key: false,
                    required: true,
                    system: true,
                    type: "date",
                    unique: false
                  },
                  {
                    constraints: {
                      default_value: [],
                      max_value: null,
                      min_value: null,
                      validator: null
                    },
                    id: "mbf_16766180539469268884",
                    name: "avatar",
                    primary_key: false,
                    required: true,
                    system: false,
                    type: "files",
                    unique: false
                  }
                ],
                has_api: true,
                id: "mbt_7691163245302450708",
                name: "test_new",
                rules: {
                  add: { expr: "", mode: "" },
                  delete: { expr: "", mode: "auth" },
                  get: { expr: "", mode: "auth" },
                  list: { expr: "", mode: "auth" },
                  update: { expr: "", mode: "auth" }
                },
                system: false,
                type: "base"
              },
              updated: "2025-12-10 23:24:46"
            },
            {
              created: "2025-12-12 16:21:45",
              id: "mbt_15118982290295364091",
              schema: {
                fields: [
                  {
                    constraints: {
                      default_value: null,
                      max_value: null,
                      min_value: null,
                      validator: "@password"
                    },
                    id: "mbf_14258576900392064537",
                    name: "id",
                    primary_key: true,
                    required: true,
                    system: true,
                    type: "string",
                    unique: false
                  },
                  {
                    constraints: {
                      default_value: null,
                      max_value: null,
                      min_value: null,
                      validator: null
                    },
                    id: "mbf_13735287961322938256",
                    name: "created",
                    primary_key: false,
                    required: true,
                    system: true,
                    type: "date",
                    unique: false
                  },
                  {
                    constraints: {
                      default_value: null,
                      max_value: null,
                      min_value: null,
                      validator: null
                    },
                    id: "mbf_9124719522053273721",
                    name: "updated",
                    primary_key: false,
                    required: true,
                    system: true,
                    type: "date",
                    unique: false
                  }
                ],
                has_api: true,
                id: "mbt_15118982290295364091",
                name: "test",
                rules: {
                  add: { expr: "", mode: "auth" },
                  delete: { expr: "", mode: "auth" },
                  get: { expr: "", mode: "auth" },
                  list: { expr: "", mode: "auth" },
                  update: { expr: "", mode: "auth" }
                },
                system: false,
                type: "base"
              },
              updated: "2025-12-12 16:21:45"
            }
          ],
          error: "",
          status: 200
        },
        null,
        2,
      )
    }

    if (operation === "delete") {
      return "Status: 204 No Content"
    }

    // Single schema response (get, create, or update)
    return JSON.stringify(
      {
        data: {
          created: "2025-12-05 02:08:06",
          id: "mbt_7691163245302450708",
          schema: {
            fields: [
              {
                constraints: {
                  default_value: null,
                  max_value: null,
                  min_value: null,
                  validator: "@password"
                },
                id: "mbf_14258576900392064537",
                name: "id",
                primary_key: true,
                required: true,
                system: true,
                type: "string",
                unique: false
              },
              {
                constraints: {
                  default_value: null,
                  max_value: null,
                  min_value: null,
                  validator: null
                },
                id: "mbf_13735287961322938256",
                name: "created",
                primary_key: false,
                required: true,
                system: true,
                type: "date",
                unique: false
              },
              {
                constraints: {
                  default_value: null,
                  max_value: null,
                  min_value: null,
                  validator: null
                },
                id: "mbf_9124719522053273721",
                name: "updated",
                primary_key: false,
                required: true,
                system: true,
                type: "date",
                unique: false
              },
              {
                constraints: {
                  default_value: [],
                  max_value: null,
                  min_value: null,
                  validator: null
                },
                id: "mbf_16766180539469268884",
                name: "avatar",
                primary_key: false,
                required: true,
                system: false,
                type: "files",
                unique: false
              }
            ],
            has_api: true,
            id: "mbt_7691163245302450708",
            name: "test_new",
            rules: {
              add: { expr: "", mode: "" },
              delete: { expr: "", mode: "auth" },
              get: { expr: "", mode: "auth" },
              list: { expr: "", mode: "auth" },
              update: { expr: "", mode: "auth" }
            },
            system: false,
            type: "base"
          },
          updated: "2025-12-10 23:24:46"
        },
        error: "",
        status: operation === "create" ? 201 : 200
      },
      null,
      2,
    )
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
                <span>Bad Request - Parsing error (message will be provided)</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="text-xs">
                  403
                </Badge>
                <span>Forbidden - Auth error (admin token required)</span>
              </div>
              {(operation === "get" || operation === "update" || operation === "delete") && (
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="text-xs">
                    404
                  </Badge>
                  <span>Not Found - Resource/item not found</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="text-xs">
                  500
                </Badge>
                <span>Internal Server Error</span>
              </div>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
