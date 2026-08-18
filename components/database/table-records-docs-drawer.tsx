"use client"

import * as React from "react"
import { ChevronDown, ChevronRight, FileText, Radio, Shield, Upload, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DocCodeBlock,
  DocCollapsibleSection,
  DocEndpointHeader,
  DocErrorList,
  DocInfoBanner,
  DocSectionHeading,
  getMethodColor,
} from "@/components/database/api-doc-shared"
import type { TableMetadata } from "@/lib/api"
import { getApiBaseUrl } from "@/lib/api"

interface TableDocsDrawerProps {
  table: TableMetadata
  open: boolean
  onClose: () => void
}

export function TableRecordDocsDrawer({ table, open, onClose }: TableDocsDrawerProps) {
  const entityName = table.schema.name
  const isAuthEntity = table.schema.type === "auth"
  const hasFileFields = table.schema.fields?.some((f) => f.type === "file" || f.type === "files") ?? false

  return (
    <Drawer open={open} onOpenChange={onClose}>
      <DrawerContent side="right" className="w-[1000px] max-w-[95vw]">
        <DrawerHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <DrawerTitle>API Documentation — {entityName}</DrawerTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DrawerDescription>
            Entity record API, realtime subscriptions{isAuthEntity ? ", authentication, API keys, and OAuth" : ""}.
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              <DocInfoBanner>
                <p className="text-sm text-muted-foreground space-y-2">
                  <span className="block">
                    <strong className="text-foreground">Credentials:</strong> send a JWT from login/refresh or an API
                    key (<code className="bg-background px-1 rounded text-xs">mb_sk_...</code>) as{" "}
                    <code className="bg-background px-1 rounded text-xs">Authorization: Bearer &lt;token&gt;</code>.
                    Not every route requires auth — access depends on each entity&apos;s rules (
                    <code className="bg-background px-1 rounded text-xs">public</code>,{" "}
                    <code className="bg-background px-1 rounded text-xs">auth</code>,{" "}
                    <code className="bg-background px-1 rounded text-xs">custom</code>, or admin-only empty mode).
                  </span>
                  <span className="block">
                    <strong className="text-foreground">Response envelope:</strong> JSON endpoints return{" "}
                    <code className="bg-background px-1 rounded text-xs">{`{ "status", "data", "error" }`}</code>.
                  </span>
                </p>
              </DocInfoBanner>

              <DocSectionHeading>Records</DocSectionHeading>

              <ApiEndpointCard
                method="GET"
                endpoint={`/api/v1/entities/${entityName}`}
                description={`List records in ${entityName}. Supports cursor pagination and optional filters.`}
                table={table}
                operation="list"
              />

              <ApiEndpointCard
                method="GET"
                endpoint={`/api/v1/entities/${entityName}/{id}`}
                description="Get a specific record by ID"
                table={table}
                operation="get"
              />

              {table.schema.type !== "view" && (
                <>
                  <ApiEndpointCard
                    method="POST"
                    endpoint={`/api/v1/entities/${entityName}`}
                    description={
                      hasFileFields
                        ? "Create a record (JSON or multipart/form-data for file fields)"
                        : "Create a new record"
                    }
                    table={table}
                    operation="create"
                    hasFileFields={hasFileFields}
                  />

                  <ApiEndpointCard
                    method="PATCH"
                    endpoint={`/api/v1/entities/${entityName}/{id}`}
                    description={
                      hasFileFields
                        ? "Update a record (JSON or multipart/form-data for file fields)"
                        : "Update a specific record"
                    }
                    table={table}
                    operation="update"
                    hasFileFields={hasFileFields}
                  />

                  <ApiEndpointCard
                    method="DELETE"
                    endpoint={`/api/v1/entities/${entityName}/{id}`}
                    description="Delete a specific record"
                    table={table}
                    operation="delete"
                  />
                </>
              )}

              {hasFileFields && <FilesDocCard entityName={entityName} />}

              {isAuthEntity && <AuthDocsSection entityName={entityName} />}

              <DocSectionHeading>Realtime</DocSectionHeading>
              <RealtimeDocCard entityName={entityName} />
            </div>
          </ScrollArea>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function AuthDocsSection({ entityName }: { entityName: string }) {
  const baseUrl = getApiBaseUrl()
  const authPrefix = `/api/v1/auth/${entityName}`

  return (
    <>
      <DocSectionHeading>Authentication</DocSectionHeading>

      <SimpleEndpointDoc
        method="POST"
        endpoint={`${authPrefix}/login`}
        description="Authenticate against this auth entity and receive a JWT. Rate-limited to 5 attempts/minute per IP. No Bearer token required."
        requestExample={`curl -X POST "${baseUrl}${authPrefix}/login" \\
  -H "Content-Type: application/json" \\
  -d '{
  "identity": "user@example.com",
  "password": "your_password"
}'`}
        responseExample={JSON.stringify(
          {
            status: 200,
            data: {
              token: "eyJhbGciOiJIUzI1NiIs...",
              user: { id: "019c1b81-364b-7000-8120-b5416b2c42c2", email: "user@example.com" },
            },
            error: "",
          },
          null,
          2,
        )}
        errors={[
          { code: "400", message: "Bad Request — invalid credentials or input" },
          { code: "404", message: "Not Found — entity not found or not auth-enabled" },
          { code: "429", message: "Too Many Requests — rate limit exceeded" },
        ]}
      />

      <SimpleEndpointDoc
        method="POST"
        endpoint={`${authPrefix}/refresh`}
        description="Refresh the current entity user JWT using the existing token."
        requestExample={`curl -X POST "${baseUrl}${authPrefix}/refresh" \\
  -H "Authorization: Bearer YOUR_JWT"`}
        responseExample={JSON.stringify(
          {
            status: 200,
            data: {
              token: "eyJhbGciOiJIUzI1NiIs...",
              user: { id: "019c1b81-364b-7000-8120-b5416b2c42c2", email: "user@example.com" },
            },
            error: "",
          },
          null,
          2,
        )}
        errors={[{ code: "401", message: "Unauthorized — invalid or expired token" }]}
      />

      <SimpleEndpointDoc
        method="POST"
        endpoint={`${authPrefix}/logout`}
        description="Invalidate the current session when the JWT contains a session_id claim."
        requestExample={`curl -X POST "${baseUrl}${authPrefix}/logout" \\
  -H "Authorization: Bearer YOUR_JWT"`}
        responseExample={JSON.stringify({ status: 200, data: { logged_out: true }, error: "" }, null, 2)}
        errors={[{ code: "401", message: "Unauthorized — invalid or missing token" }]}
      />

      <SimpleEndpointDoc
        method="GET"
        endpoint="/api/v1/auth/verify"
        description="Verify that the current JWT or API key is valid. Rate-limited to 5 requests/minute per IP."
        requestExample={`curl "${baseUrl}/api/v1/auth/verify" \\
  -H "Authorization: Bearer YOUR_TOKEN"`}
        responseExample={JSON.stringify({ status: 200, data: { status: "OK" }, error: "" }, null, 2)}
        errors={[{ code: "401", message: "Unauthorized — invalid or expired credentials" }]}
      />

      <DocSectionHeading>API Keys</DocSectionHeading>

      <SimpleEndpointDoc
        method="GET"
        endpoint={`${authPrefix}/api-keys`}
        description="List API keys for the authenticated user. Raw secrets are never returned in list responses."
        requestExample={`curl "${baseUrl}${authPrefix}/api-keys" \\
  -H "Authorization: Bearer YOUR_JWT"`}
        responseExample={JSON.stringify(
          {
            status: 200,
            data: [
              {
                id: "mbak_123456789",
                entity_name: entityName,
                user_id: "019c1b81-364b-7000-8120-b5416b2c42c2",
                label: "Mobile app",
                permissions: [],
                last_used: null,
                created: "2026-01-15T10:00:00Z",
                expires_at: null,
              },
            ],
            error: "",
          },
          null,
          2,
        )}
        errors={[{ code: "401", message: "Unauthorized" }]}
      />

      <SimpleEndpointDoc
        method="POST"
        endpoint={`${authPrefix}/api-keys`}
        description="Create a new API key. The raw mb_sk_... secret is returned once at creation time."
        requestExample={`curl -X POST "${baseUrl}${authPrefix}/api-keys" \\
  -H "Authorization: Bearer YOUR_JWT" \\
  -H "Content-Type: application/json" \\
  -d '{
  "label": "Mobile app",
  "permissions": [],
  "expires_at": ""
}'`}
        responseExample={JSON.stringify(
          {
            status: 201,
            data: {
              id: "mbak_123456789",
              entity_name: entityName,
              user_id: "019c1b81-364b-7000-8120-b5416b2c42c2",
              label: "Mobile app",
              key: "mb_sk_a1b2c3d4e5f6...",
              created: "2026-01-15T10:00:00Z",
            },
            error: "",
          },
          null,
          2,
        )}
        errors={[{ code: "401", message: "Unauthorized" }]}
      />

      <SimpleEndpointDoc
        method="DELETE"
        endpoint={`${authPrefix}/api-keys/{id}`}
        description="Revoke an API key by ID."
        requestExample={`curl -X DELETE "${baseUrl}${authPrefix}/api-keys/mbak_123456789" \\
  -H "Authorization: Bearer YOUR_JWT"`}
        responseExample={JSON.stringify({ status: 200, data: { deleted: true }, error: "" }, null, 2)}
        errors={[
          { code: "401", message: "Unauthorized" },
          { code: "404", message: "Not Found — key does not exist" },
        ]}
      />

      <DocSectionHeading>OAuth</DocSectionHeading>

      <DocCollapsibleSection
        icon={<Shield className="h-4 w-4 text-muted-foreground" />}
        title="OAuth login & account linking"
        description="Browser redirect flow (PKCE) and programmatic account management for enabled providers."
      >
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className={getMethodColor("GET")} variant="secondary">
                GET
              </Badge>
              <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                {authPrefix}/oauth/authorize/{"{provider}"}
              </code>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Start OAuth login — redirects the browser to the provider authorization URL. Optional{" "}
              <code className="bg-muted px-1 rounded">redirect_uri</code> query param; defaults to the server callback
              route.
            </p>
            <DocCodeBlock
              code={`# Browser redirect (no Bearer token)
${baseUrl}${authPrefix}/oauth/authorize/google?redirect_uri=https://your-app.com/callback`}
              height="h-24"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className={getMethodColor("GET")} variant="secondary">
                GET
              </Badge>
              <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                {authPrefix}/oauth/callback/{"{provider}"}
              </code>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              OAuth callback — handles <code className="bg-muted px-1 rounded">code</code>,{" "}
              <code className="bg-muted px-1 rounded">state</code>, and provider error query params. Returns JWT and
              user record on success.
            </p>
          </div>

          <SimpleEndpointDoc
            method="GET"
            endpoint={`${authPrefix}/oauth/providers`}
            description="List OAuth providers enabled for this entity. No authentication required."
            requestExample={`curl "${baseUrl}${authPrefix}/oauth/providers"`}
            responseExample={JSON.stringify(
              { status: 200, data: [{ name: "google", enabled: true }], error: "" },
              null,
              2,
            )}
            nested
          />

          <SimpleEndpointDoc
            method="GET"
            endpoint={`${authPrefix}/oauth/accounts`}
            description="List OAuth accounts linked to the current authenticated user."
            requestExample={`curl "${baseUrl}${authPrefix}/oauth/accounts" \\
  -H "Authorization: Bearer YOUR_JWT"`}
            responseExample={JSON.stringify(
              {
                status: 200,
                data: [{ provider: "google", provider_user_id: "123456", linked_at: "2026-01-15T10:00:00Z" }],
                error: "",
              },
              null,
              2,
            )}
            nested
          />

          <SimpleEndpointDoc
            method="POST"
            endpoint={`${authPrefix}/oauth/link/{provider}`}
            description="Link an OAuth provider to the current user using authorization code and state from the provider."
            requestExample={`curl -X POST "${baseUrl}${authPrefix}/oauth/link/google" \\
  -H "Authorization: Bearer YOUR_JWT" \\
  -H "Content-Type: application/json" \\
  -d '{
  "code": "provider_auth_code",
  "state": "csrf_state_value"
}'`}
            responseExample={JSON.stringify({ status: 200, data: {}, error: "" }, null, 2)}
            nested
          />

          <SimpleEndpointDoc
            method="DELETE"
            endpoint={`${authPrefix}/oauth/link/{provider}`}
            description="Unlink an OAuth provider from the current user."
            requestExample={`curl -X DELETE "${baseUrl}${authPrefix}/oauth/link/google" \\
  -H "Authorization: Bearer YOUR_JWT"`}
            responseExample={JSON.stringify({ status: 200, data: { unlinked: true }, error: "" }, null, 2)}
            nested
          />

          <p className="text-sm text-muted-foreground">
            OAuth providers are registered by admins via{" "}
            <code className="bg-muted px-1 rounded">/api/v1/sys/oauth/providers</code> and enabled per entity via{" "}
            <code className="bg-muted px-1 rounded">/api/v1/sys/oauth/entity-config</code>.
          </p>
        </div>
      </DocCollapsibleSection>
    </>
  )
}

function FilesDocCard({ entityName }: { entityName: string }) {
  const baseUrl = getApiBaseUrl()
  const exampleUrl = `${baseUrl}/api/v1/files/${entityName}/uploads/photo.jpg`

  return (
    <DocCollapsibleSection
      icon={<Upload className="h-4 w-4 text-muted-foreground" />}
      title="File uploads"
      description="Serve uploaded files from file/files fields. Access follows the entity get access rule."
    >
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge className={getMethodColor("GET")} variant="secondary">
            GET
          </Badge>
          <code className="text-sm font-mono bg-muted px-2 py-1 rounded">/api/v1/files/{entityName}/{"{file}"}</code>
        </div>
        <p className="text-sm text-muted-foreground mb-2">
          Returns the stored file binary. The <code className="bg-muted px-1 rounded">file</code> path segment may
          include subdirectories (e.g. <code className="bg-muted px-1 rounded">uploads/photo.jpg</code>).
        </p>
        <DocCodeBlock code={`curl "${exampleUrl}" -H "Authorization: Bearer YOUR_TOKEN"`} height="h-24" />
      </div>
      <div className="text-sm text-muted-foreground">
        <p>
          For create/update with file fields, send <code className="bg-muted px-1 rounded">multipart/form-data</code>{" "}
          instead of JSON. Non-file fields are sent as form fields alongside file parts.
        </p>
      </div>
    </DocCollapsibleSection>
  )
}

function RealtimeDocCard({ entityName }: { entityName: string }) {
  const baseUrl = getApiBaseUrl()
  const wsBase = baseUrl.replace(/^http/, "ws")
  const sampleRowId = "019c1b81-364b-7000-8120-b5416b2c42c2"

  const sseConnectExample = `# SSE — subscribe to this entity and/or a specific row
curl -N -H "Authorization: Bearer YOUR_TOKEN" \\
  "${baseUrl}/api/v1/realtime?topics=${entityName},${entityName}:${sampleRowId}"`

  const sseUpdateExample = `# Update topics for an existing SSE session (client_id from the "connected" event)
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

  const wsExample = `# WebSocket alternative (disabled when MB_REALTIME_WS=false)
# Connect, then send JSON messages to subscribe/unsubscribe
wscat -c "${wsBase}/api/v1/realtime/ws" \\
  -H "Authorization: Bearer YOUR_TOKEN"

# After connecting, send:
{"topics": ["${entityName}", "${entityName}:${sampleRowId}"]}

# Clear subscriptions:
{"topics": []}`

  const changeEventExample = JSON.stringify(
    {
      action: "update",
      entity: entityName,
      row_id: sampleRowId,
      topic: `${entityName}:${sampleRowId}`,
      timestamp: 1737014400,
      data: { id: sampleRowId, title: "Updated value" },
    },
    null,
    2,
  )

  return (
    <>
      <DocCollapsibleSection
        icon={<Radio className="h-4 w-4 text-muted-foreground" />}
        title="Server-Sent Events (SSE)"
        description="Long-lived HTTP stream. Disabled when MB_REALTIME_SSE=false. Topic = entity name (list access) or entity:row_id (get access)."
      >
        <div>
          <h5 className="font-medium mb-1">Connect</h5>
          <DocCodeBlock code={sseConnectExample} height="h-28" />
        </div>
        <div>
          <h5 className="font-medium mb-1">Update topics</h5>
          <DocCodeBlock code={sseUpdateExample} height="h-44" />
        </div>
        <div>
          <h5 className="font-medium mb-2">Event types</h5>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                connected
              </Badge>
              <span>Sent once when the stream opens; includes client_id and topics.</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                ping
              </Badge>
              <span>Keep-alive sent periodically.</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                change
              </Badge>
              <span>Database change with action, entity, row_id, and data payload.</span>
            </div>
          </div>
        </div>
        <div>
          <h5 className="font-medium mb-1">change event payload</h5>
          <DocCodeBlock code={changeEventExample} height="h-36" />
        </div>
        <p className="text-sm text-muted-foreground">
          In browsers, EventSource cannot send Authorization headers — use fetch() with the same URL and read the body
          as a stream, or use the WebSocket endpoint below.
        </p>
      </DocCollapsibleSection>

      <DocCollapsibleSection
        icon={<Radio className="h-4 w-4 text-muted-foreground" />}
        title="WebSocket"
        description="Alternative to SSE at WS /api/v1/realtime/ws. Disabled when MB_REALTIME_WS=false. Same change payload shape as SSE."
      >
        <DocCodeBlock code={wsExample} height="h-44" />
        <p className="text-sm text-muted-foreground">
          After the WebSocket upgrade, send JSON messages with a topics array. Change events arrive as JSON messages
          using the same RealtimeChangeEvent shape as SSE change events.
        </p>
      </DocCollapsibleSection>
    </>
  )
}

function SimpleEndpointDoc({
  method,
  endpoint,
  description,
  requestExample,
  responseExample,
  errors,
  nested = false,
}: {
  method: string
  endpoint: string
  description: string
  requestExample: string
  responseExample: string
  errors?: Array<{ code: string; message: string }>
  nested?: boolean
}) {
  const [isOpen, setIsOpen] = React.useState(false)

  const content = (
    <>
      <CollapsibleTrigger asChild>
        <div
          className={
            nested ? "cursor-pointer" : "p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
          }
        >
          {!nested && <DocEndpointHeader method={method} endpoint={endpoint} description={description} isOpen={isOpen} />}
          {nested && (
            <div className="flex items-center gap-2 mb-1">
              <Badge className={getMethodColor(method)} variant="secondary">
                {method}
              </Badge>
              <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{endpoint}</code>
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </div>
          )}
          {nested && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className={nested ? "mt-4 space-y-4" : "border-l-2 border-muted ml-4 pl-6 space-y-6 mt-4"}>
          <div>
            <h5 className="font-medium mb-2">Request Example</h5>
            <DocCodeBlock code={requestExample} />
          </div>
          <div>
            <h5 className="font-medium mb-2">Response Example</h5>
            <DocCodeBlock code={responseExample} />
          </div>
          {errors && errors.length > 0 && <DocErrorList errors={errors} />}
        </div>
      </CollapsibleContent>
    </>
  )

  if (nested) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {content}
      </Collapsible>
    )
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      {content}
    </Collapsible>
  )
}

function ApiEndpointCard({
  method,
  endpoint,
  description,
  table,
  operation,
  hasFileFields = false,
}: {
  method: string
  endpoint: string
  description: string
  table: TableMetadata
  operation: string
  hasFileFields?: boolean
}) {
  const [isOpen, setIsOpen] = React.useState(false)
  const baseUrl = getApiBaseUrl()

  const generateRequestExample = () => {
    let url = `${baseUrl}${endpoint}`

    if (operation === "list") {
      const filter = encodeURIComponent(JSON.stringify({ status: "active" }))
      url += `?limit=50&after=last_record_id&filter=${filter}`
    }

    let example = `curl -X ${method} "${url}"`

    if (method !== "GET") {
      example += ` \\\n  -H "Content-Type: application/json"`
    }

    example += ` \\\n  -H "Authorization: Bearer YOUR_TOKEN"`

    if (operation === "create" || operation === "update") {
      const sampleData: Record<string, string> = {}
      table.schema.fields?.forEach((field) => {
        if (field.name === "id" || field.name === "created" || field.name === "updated") return
        if (field.type === "file" || field.type === "files") return
        if (field.name === "email") {
          sampleData[field.name] = "user@example.com"
        } else if (field.name === "password") {
          sampleData[field.name] = "securepassword"
        } else {
          sampleData[field.name] = `sample_${field.name}`
        }
      })

      example += ` \\\n  -d '${JSON.stringify(sampleData, null, 2)}'`

      if (hasFileFields) {
        example += `\n\n# Or use multipart/form-data for file fields:\n# curl -X ${method} "${baseUrl}${endpoint}" \\\n#   -H "Authorization: Bearer YOUR_TOKEN" \\\n#   -F "title=My post" \\\n#   -F "avatar=@/path/to/photo.jpg"`
      }
    }

    return example
  }

  const generateResponseExample = () => {
    const sampleRecord: Record<string, string> = {}
    table.schema.fields?.forEach((field) => {
      if (field.name === "id") {
        sampleRecord[field.name] = "019c1b81-364b-7000-8120-b5416b2c42c2"
      } else if (field.name === "created" || field.name === "updated") {
        sampleRecord[field.name] = "2026-01-15T10:00:00Z"
      } else if (field.name === "email") {
        sampleRecord[field.name] = "user@example.com"
      } else if (field.name === "password") {
        return
      } else if (field.type === "file") {
        sampleRecord[field.name] = "uploads/photo.jpg"
      } else if (field.type === "files") {
        sampleRecord[field.name] = "uploads/photo.jpg,uploads/doc.pdf"
      } else {
        sampleRecord[field.name] = `sample_${field.name}`
      }
    })

    if (operation === "list") {
      return JSON.stringify(
        {
          status: 200,
          data: {
            items: [sampleRecord],
            items_count: 1,
            limit: 50,
            has_more: false,
            cursor: null,
          },
          error: "",
        },
        null,
        2,
      )
    }

    if (operation === "delete") {
      return JSON.stringify({ status: 200, data: null, error: "" }, null, 2)
    }

    const status = operation === "create" ? 201 : 200
    return JSON.stringify({ status, data: sampleRecord, error: "" }, null, 2)
  }

  const requestExample = generateRequestExample()
  const responseExample = generateResponseExample()

  const errors: Array<{ code: string; message: string }> = [
    { code: "400", message: "Bad Request — invalid input data" },
    { code: "401", message: "Unauthorized — invalid or missing token" },
    { code: "403", message: "Forbidden — access denied by entity rules" },
    { code: "500", message: "Internal Server Error" },
  ]

  if (operation === "get" || operation === "update" || operation === "delete") {
    errors.splice(3, 0, { code: "404", message: "Not Found — record does not exist" })
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
          <DocEndpointHeader method={method} endpoint={endpoint} description={description} isOpen={isOpen} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-l-2 border-muted ml-4 pl-6 space-y-6 mt-4">
          {operation === "list" && (
            <div className="text-sm text-muted-foreground">
              <p>
                Query params: <code className="bg-muted px-1 rounded">limit</code> (1–500, default 50),{" "}
                <code className="bg-muted px-1 rounded">after</code> (cursor — id of last item from previous page),{" "}
                <code className="bg-muted px-1 rounded">filter</code> (URL-encoded JSON object of field equality
                filters). Results ordered by id ascending.
              </p>
            </div>
          )}
          <div>
            <h5 className="font-medium mb-2">Request Example</h5>
            <DocCodeBlock code={requestExample} height={operation === "list" || hasFileFields ? "h-56" : "h-48"} />
          </div>
          <div>
            <h5 className="font-medium mb-2">Response Example</h5>
            <DocCodeBlock code={responseExample} />
          </div>
          <DocErrorList errors={errors} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
