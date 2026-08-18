"use client"

import * as React from "react"
import { BookOpen, FileText, X } from "lucide-react"

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
} from "@/components/database/api-doc-shared"
import { dataTypes, intPrecisions } from "@/lib/field-types"
import { getApiBaseUrl } from "@/lib/api"

interface TableDocsDrawerProps {
  open: boolean
  onClose: () => void
}

export function TableDocsDrawer({ open, onClose }: TableDocsDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onClose}>
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
            Admin-only endpoints for managing entity schemas, field types, and access rules.
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              <DocInfoBanner>
                <p className="text-sm text-muted-foreground space-y-2">
                  <span className="block">
                    <strong className="text-foreground">Admin authentication required:</strong> all schema endpoints
                    require an admin JWT in{" "}
                    <code className="bg-background px-1 rounded text-xs">Authorization: Bearer YOUR_ADMIN_TOKEN</code>.
                  </span>
                  <span className="block">
                    <strong className="text-foreground">Response envelope:</strong>{" "}
                    <code className="bg-background px-1 rounded text-xs">{`{ "status", "data", "error" }`}</code>.
                  </span>
                </p>
              </DocInfoBanner>

              <DocSectionHeading>Schema CRUD</DocSectionHeading>

              <ApiEndpointCard
                method="GET"
                endpoint="/api/v1/schemas"
                description="List all entity schemas"
                operation="list"
              />

              <ApiEndpointCard
                method="GET"
                endpoint="/api/v1/schemas/{schema_name_or_id}"
                description="Get a specific entity schema by name or ID"
                operation="get"
              />

              <ApiEndpointCard
                method="POST"
                endpoint="/api/v1/schemas"
                description="Create a new entity schema"
                operation="create"
              />

              <ApiEndpointCard
                method="PATCH"
                endpoint="/api/v1/schemas/{schema_name_or_id}"
                description="Update an existing entity schema (add/update/delete fields by id or name)"
                operation="update"
              />

              <ApiEndpointCard
                method="DELETE"
                endpoint="/api/v1/schemas/{schema_name_or_id}"
                description="Delete an entity schema"
                operation="delete"
              />

              <DocSectionHeading>Reference</DocSectionHeading>

              <SchemaReferenceSection />
            </div>
          </ScrollArea>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function SchemaReferenceSection() {
  const fieldTypesList = dataTypes
    .map((type) => {
      if (type === "int") {
        return `int — integer with precision (${intPrecisions.join(", ")})`
      }
      return type
    })
    .join("\n")

  const entityTypesExample = JSON.stringify(
    {
      base: "Standard CRUD entity with configurable access rules",
      auth: "User authentication entity — enables /auth/{name}/login, API keys, and OAuth",
      view: "Read-only SQL view — requires view_query, mutations rejected",
    },
    null,
    2,
  )

  const accessRulesExample = JSON.stringify(
    {
      rules: {
        list: { mode: "public", expr: "" },
        get: { mode: "auth", expr: "" },
        add: { mode: "auth", expr: "" },
        update: { mode: "custom", expr: "@request.auth.id == @record.owner_id" },
        delete: { mode: "", expr: "" },
      },
    },
    null,
    2,
  )

  const intFieldExample = JSON.stringify(
    {
      name: "quantity",
      type: "int",
      precision: "i32",
      primary_key: false,
      required: true,
      system: false,
      unique: false,
      constraints: {
        default_value: null,
        max_value: 1000,
        min_value: 0,
        validator: null,
      },
    },
    null,
    2,
  )

  return (
    <>
      <DocCollapsibleSection
        icon={<BookOpen className="h-4 w-4 text-muted-foreground" />}
        title="Field types"
        description="Supported field types when creating or patching schema fields."
      >
        <DocCodeBlock code={fieldTypesList} height="h-36" />
        <div>
          <h5 className="font-medium mb-2">Integer precision example</h5>
          <p className="text-sm text-muted-foreground mb-2">
            Use type <code className="bg-muted px-1 rounded">int</code> with a{" "}
            <code className="bg-muted px-1 rounded">precision</code> property. Legacy types (int32, uint64, etc.) are
            normalized to <code className="bg-muted px-1 rounded">int</code> + precision on load.
          </p>
          <DocCodeBlock code={intFieldExample} height="h-48" />
        </div>
        <p className="text-sm text-muted-foreground">
          <code className="bg-muted px-1 rounded">file</code> and <code className="bg-muted px-1 rounded">files</code>{" "}
          fields store upload paths served at <code className="bg-muted px-1 rounded">GET /api/v1/files/{"{entity}"}/{"{file}"}</code>.
          Create/update records with <code className="bg-muted px-1 rounded">multipart/form-data</code>.
        </p>
      </DocCollapsibleSection>

      <DocCollapsibleSection
        icon={<BookOpen className="h-4 w-4 text-muted-foreground" />}
        title="Entity types"
        description="The type property determines entity behavior and available API routes."
      >
        <DocCodeBlock code={entityTypesExample} height="h-36" />
      </DocCollapsibleSection>

      <DocCollapsibleSection
        icon={<BookOpen className="h-4 w-4 text-muted-foreground" />}
        title="Access rules"
        description="Each CRUD operation has a mode and optional custom expression."
      >
        <DocCodeBlock code={accessRulesExample} height="h-44" />
        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong className="text-foreground">Modes:</strong>{" "}
            <code className="bg-muted px-1 rounded">public</code> — no auth required;{" "}
            <code className="bg-muted px-1 rounded">auth</code> — authenticated user required;{" "}
            <code className="bg-muted px-1 rounded">custom</code> — expression must evaluate true; empty mode — admin
            only (not exposed on public entity API).
          </p>
          <p>
            Realtime topic access mirrors list (entity name) and get (entity:row_id) rules.
          </p>
        </div>
      </DocCollapsibleSection>

      <DocCollapsibleSection
        icon={<BookOpen className="h-4 w-4 text-muted-foreground" />}
        title="Field patch operations"
        description="When updating a schema via PATCH, fields support add, update, and delete."
      >
        <DocCodeBlock
          code={`// Add new field (omit id)
{ "name": "new_field", "type": "string", ... }

// Update existing field (include id)
{ "id": "mbf_existing_field_id", "name": "renamed_field", "type": "string", ... }

// Delete field
{ "id": "mbf_field_to_delete", "op": "delete" }`}
          height="h-40"
        />
      </DocCollapsibleSection>
    </>
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
  const baseUrl = getApiBaseUrl()

  const generateRequestExample = () => {
    let example = `curl -X ${method} "${baseUrl}${endpoint}"`

    if (method !== "GET") {
      example += ` \\\n  -H "Content-Type: application/json"`
    }

    example += ` \\\n  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"`

    if (operation === "create") {
      const sampleSchema = {
        name: "example_entity",
        type: "base",
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
              validator: null,
            },
          },
          {
            name: "count",
            type: "int",
            precision: "i32",
            primary_key: false,
            required: false,
            system: false,
            unique: false,
            constraints: {
              default_value: 0,
              max_value: null,
              min_value: null,
              validator: null,
            },
          },
        ],
        rules: {
          add: { expr: "", mode: "auth" },
          delete: { expr: "", mode: "auth" },
          get: { expr: "", mode: "auth" },
          list: { expr: "", mode: "auth" },
          update: { expr: "", mode: "auth" },
        },
      }
      example += ` \\\n  -d '${JSON.stringify(sampleSchema, null, 2)}'`
    } else if (operation === "update") {
      const sampleUpdate = {
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
              validator: null,
            },
          },
          {
            name: "new_field",
            type: "int",
            precision: "u32",
            primary_key: false,
            required: false,
            system: false,
            unique: false,
            constraints: {
              default_value: null,
              max_value: null,
              min_value: null,
              validator: null,
            },
          },
          {
            id: "mbf_field_to_delete",
            op: "delete",
          },
        ],
      }
      example += ` \\\n  -d '${JSON.stringify(sampleUpdate, null, 2)}'`
    }

    return example
  }

  const generateResponseExample = () => {
    const sampleSchema = {
      created: "2026-01-15T10:00:00Z",
      id: "mbt_7691163245302450708",
      schema: {
        fields: [
          {
            constraints: { default_value: null, max_value: null, min_value: null, validator: "@password" },
            id: "mbf_14258576900392064537",
            name: "id",
            primary_key: true,
            required: true,
            system: true,
            type: "string",
            unique: false,
          },
          {
            constraints: { default_value: null, max_value: null, min_value: null, validator: null },
            id: "mbf_13735287961322938256",
            name: "created",
            primary_key: false,
            required: true,
            system: true,
            type: "date",
            unique: false,
          },
          {
            constraints: { default_value: null, max_value: null, min_value: null, validator: null },
            id: "mbf_9124719522053273721",
            name: "updated",
            primary_key: false,
            required: true,
            system: true,
            type: "date",
            unique: false,
          },
          {
            constraints: { default_value: 0, max_value: null, min_value: null, validator: null },
            id: "mbf_16766180539469268884",
            name: "count",
            precision: "i32",
            primary_key: false,
            required: false,
            system: false,
            type: "int",
            unique: false,
          },
        ],
        has_api: true,
        id: "mbt_7691163245302450708",
        name: "example_entity",
        rules: {
          add: { expr: "", mode: "auth" },
          delete: { expr: "", mode: "auth" },
          get: { expr: "", mode: "auth" },
          list: { expr: "", mode: "auth" },
          update: { expr: "", mode: "auth" },
        },
        system: false,
        type: "base",
      },
      updated: "2026-01-15T10:00:00Z",
    }

    if (operation === "list") {
      return JSON.stringify({ status: 200, data: [sampleSchema], error: "" }, null, 2)
    }

    if (operation === "delete") {
      return JSON.stringify({ status: 200, data: null, error: "" }, null, 2)
    }

    const status = operation === "create" ? 201 : 200
    return JSON.stringify({ status, data: sampleSchema, error: "" }, null, 2)
  }

  const requestExample = generateRequestExample()
  const responseExample = generateResponseExample()

  const errors: Array<{ code: string; message: string }> = [
    { code: "400", message: "Bad Request — parsing or validation error" },
    { code: "401", message: "Unauthorized — admin token required" },
    { code: "403", message: "Forbidden — admin access denied" },
    { code: "500", message: "Internal Server Error" },
  ]

  if (operation === "get" || operation === "update" || operation === "delete") {
    errors.splice(3, 0, { code: "404", message: "Not Found — schema not found" })
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
          <div>
            <h5 className="font-medium mb-2">Request Example</h5>
            <DocCodeBlock code={requestExample} height={operation === "create" || operation === "update" ? "h-64" : "h-48"} />
          </div>
          <div>
            <h5 className="font-medium mb-2">Response Example</h5>
            <DocCodeBlock code={responseExample} height="h-64" />
          </div>
          <DocErrorList errors={errors} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
