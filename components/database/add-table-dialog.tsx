"use client"

import * as React from "react"
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Lock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import type { ApiClient, TableMetadata, TableField } from "@/lib/api"
import { dataTypes } from "@/lib/constants"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { hash } from "crypto"
import { fi } from "date-fns/locale"

interface AddTableDialogProps {
  apiClient: ApiClient
  onTablesUpdate: (tables: TableMetadata[]) => void
  children?: React.ReactNode
}

interface Field {
  id?: string  // Optional - missing/empty means new field
  name: string
  type: string
  primary_key: boolean
  nullable: boolean
  unique?: boolean
  system?: boolean
  required?: boolean
  constraints: {
    default_value: any
    max_value: number | null
    min_value: number | null
    validator: string | null
  }
}

export function AddTableDialog({ apiClient, onTablesUpdate, children }: AddTableDialogProps) {
  const [tableType, setTableType] = React.useState<"base" | "auth" | "view">("base")
  const [tableName, setTableName] = React.useState("")
  const [fields, setFields] = React.useState<Field[]>([])
  const [sqlQuery, setSqlQuery] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null)
  const [expandedFields, setExpandedFields] = React.useState<Set<string>>(new Set())
  const { toast } = useToast()

  // Get unique key for field (use id if exists, otherwise generate one)
  const getFieldKey = (field: Field, index: number) => field.id || `temp-${index}`
  const genFieldBaseId = (name: string) => `mbf-${hash(name, "sha256").toString()}`

  // When drawer opens, reset and add base fields
  React.useEffect(() => {
    if (open) {
      setTableName("")
      setSqlQuery("")
      setIsLoading(false)
      setTableType("base")
      setExpandedFields(new Set())
      addBaseFields()
    }
  }, [open])

  function addBaseFields() {
    if (tableType === "view") {
      setFields([])
    } else {
      // Add base fields
      setFields([
        {
          id: genFieldBaseId("id"),
          name: "id",
          type: "string",
          primary_key: true,
          nullable: false,
          system: true,
          required: true,
          unique: false,
          constraints: {
            min_value: 6,
            max_value: null,
            default_value: null,
            validator: "@password"
          }
        },
        {
          id: genFieldBaseId("created"),
          name: "created",
          type: "date",
          primary_key: false,
          nullable: false,
          system: true,
          required: true,
          unique: false,
          constraints: {
            min_value: null,
            max_value: null,
            default_value: null,
            validator: null
          }
        },
        {
          id: genFieldBaseId("updated"),
          name: "updated",
          type: "date",
          primary_key: false,
          nullable: false,
          system: true,
          required: true,
          unique: false,
          constraints: {
            min_value: null,
            max_value: null,
            default_value: null,
            validator: null
          }
        },
      ])

      // For auth types, extend with auth specific fields
      if (tableType === "auth") {
        setFields([
          ...fields,
          {
            id: genFieldBaseId("name"),
            name: "name",
            type: "string",
            primary_key: false,
            nullable: false,
            system: true,
            required: true,
            unique: false,
            constraints: {
              min_value: 3,
              max_value: null,
              default_value: null,
              validator: null
            }
          },
          {
            id: genFieldBaseId("email"),
            name: "email",
            type: "string",
            primary_key: false,
            nullable: false,
            system: true,
            required: true,
            unique: true,
            constraints: {
              min_value: 5,
              max_value: null,
              default_value: null,
              validator: "@email"
            }
          },
          {
            id: genFieldBaseId("password"),
            name: "password",
            type: "string",
            primary_key: false,
            nullable: false,
            system: true,
            required: true,
            unique: false,
            constraints: {
              min_value: 6,
              max_value: null,
              default_value: null,
              validator: "@password"
            }
          },
        ])
      }
    }
  }

  React.useEffect(() => {
    if (open) {
      addBaseFields()
    }
  }, [tableType, open])

  const addField = () => {
    setFields([
      ...fields,
      {
        name: "",
        type: "string",
        primary_key: false,
        nullable: true,
        system: false,
        required: false,
        unique: false,
        constraints: {
          min_value: null,
          max_value: null,
          default_value: null,
          validator: null
        }
      },
    ])
  }

  const removeField = (fieldKey: string) => {
    setFields((prevFields) => {
      const fieldIndex = prevFields.findIndex((f, idx) => (f.id || `temp-${idx}`) === fieldKey)
      if (fieldIndex >= 0 && !prevFields[fieldIndex].system) {
        const newFields = prevFields.filter((_, idx) => idx !== fieldIndex)
        setExpandedFields((prev) => {
          const next = new Set(prev)
          next.delete(fieldKey)
          return next
        })
        return newFields
      }
      return prevFields
    })
  }

  const updateField = (fieldKey: string, updates: Partial<Field> & { constraints?: Partial<Field['constraints']> }) => {
    setFields((prevFields) =>
      prevFields.map((field, index) => {
        const currentKey = field.id || `temp-${index}`
        if (currentKey === fieldKey) {
          // Handle constraints updates
          if (updates.constraints) {
            return {
              ...field,
              ...updates,
              constraints: { ...field.constraints, ...updates.constraints }
            }
          }
          return { ...field, ...updates }
        }
        return field
      }),
    )
  }

  const toggleFieldExpanded = (fieldKey: string) => {
    setExpandedFields((prev) => {
      const next = new Set(prev)
      if (next.has(fieldKey)) {
        next.delete(fieldKey)
      } else {
        next.add(fieldKey)
      }
      return next
    })
  }

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const draggedField = fields[draggedIndex]
    const targetField = fields[index]

    // Allow moving system fields, but don't allow placing non-system fields before system fields
    // This maintains system field integrity while allowing reordering
    const newFields = [...fields]
    newFields.splice(draggedIndex, 1)
    newFields.splice(index, 0, draggedField)
    setFields(newFields)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const handleSubmit = async () => {
    if (!tableName.trim()) return

    setIsLoading(true)
    try {
      // For view types, require SQL query
      if (tableType === "view" && !sqlQuery.trim()) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please provide a SQL query for view entities.",
        })
        setIsLoading(false)
        return
      }

      // For base and auth types, require at least one user field with a name
      if (tableType !== "view") {
        const userFields = fields.filter((f) => !f.system && f.name.trim())
        if (userFields.length === 0) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Please add at least one field with a name to the entity.",
          })
          setIsLoading(false)
          return
        }
      }

      // Include all fields in order (system + user) for base/auth types
      // For view types, fields are typically empty or derived from SQL
      const allFields = tableType === "view"
        ? []
        : fields.map(
          (field): TableField => {
            const fieldData: any = {
              name: field.name,
              type: field.type,
              primary_key: field.primary_key,
              required: field.required || !field.nullable,
              unique: field.unique || false,
              system: field.system || false,
              constraints: field.constraints,
            }
            // Only include id if it exists (for existing fields being updated)
            if (field.id) {
              fieldData.id = field.id
            }
            return fieldData
          },
        )

      const tableData: any = {
        name: tableName,
        type: tableType,
        schema: {
          id: "", // Will be generated by the API
          name: tableName,
          has_api: true,
          system: false,
          type: tableType,
          fields: allFields,
          rules: {
            add: {
              expr: "",
              mode: "auth"
            },
            delete: {
              expr: "",
              mode: "auth"
            },
            get: {
              expr: "",
              mode: "auth"
            },
            list: {
              expr: "",
              mode: "auth"
            },
            update: {
              expr: "",
              mode: "auth"
            }
          },
          ...(tableType === "view" && { sql: sqlQuery.trim() }),
        },
      }

      const res: any = await apiClient.call("/api/v1/schemas", {
        method: "POST",
        body: JSON.stringify(tableData),
      })

      if (res?.error?.length > 0) throw res.error

      const response: any = await apiClient.call("/api/v1/schemas")
      if (response?.error?.length > 0) throw response.error

      // Handle different response structures
      let updatedTables: TableMetadata[] = []
      if (Array.isArray(response)) {
        updatedTables = response
      } else if (response?.data && Array.isArray(response.data)) {
        updatedTables = response.data
      }

      onTablesUpdate(updatedTables)
      setTableName("")
      setSqlQuery("")
      setOpen(false)

      toast({
        title: "Entity Created",
        description: `The entity '${tableName}' has been created successfully.`,
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || "Failed to create entity",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {children || (
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Table
          </Button>
        )}
      </DrawerTrigger>
      <DrawerContent side="right" className="w-full sm:w-[600px]">
        <DrawerHeader>
          <DrawerTitle>Create New Entity</DrawerTitle>
          <DrawerDescription>Create a new entity with custom fields and settings.</DrawerDescription>
        </DrawerHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-6 py-4">
            {/* Entity Name and Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entity-name">Entity Name</Label>
                <Input
                  id="entity-name"
                  placeholder="Enter entity name"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="entity-type">Type</Label>
                <Select value={tableType} onValueChange={(value: "base" | "auth" | "view") => setTableType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="base">Base</SelectItem>
                    <SelectItem value="auth">Auth</SelectItem>
                    <SelectItem value="view">View</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* SQL Query Section for View Types */}
            {tableType === "view" && (
              <div className="space-y-2">
                <Label htmlFor="sql-query">SQL Query</Label>
                <Textarea
                  id="sql-query"
                  placeholder="CREATE VIEW view_name AS SELECT id, column1, column2 FROM table_name WHERE condition..."
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
                <div className="rounded-md bg-muted/50 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">
                    Note: The SQL query should start with <code className="text-foreground">CREATE VIEW</code> or similar statement.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    At least one <code className="text-foreground">id</code> field is required in the view result.
                  </p>
                </div>
              </div>
            )}

            {/* Fields Section */}
            {tableType !== "view" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Fields</Label>
                    <p className="text-sm text-muted-foreground">Define the fields for your entity</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {fields.map((field, index) => {
                    const fieldKey = getFieldKey(field, index)
                    return (
                      <div
                        key={fieldKey}
                        draggable={true}
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          "border rounded-lg p-4 space-y-3 transition-colors",
                          field.system && "bg-muted/30 border-muted",
                          draggedIndex === index && "opacity-50"
                        )}
                      >
                        {/* Field Header - Name and Type */}
                        <div className="flex items-center gap-3">
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-move flex-shrink-0" />
                          {field.system && (
                            <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <div className="flex-1 grid grid-cols-2 gap-3">
                            <div>
                              <Input
                                placeholder="Field name"
                                value={field.name}
                                onChange={(e) => updateField(fieldKey, { name: e.target.value })}
                                disabled={field.system}
                                className={field.system ? "bg-muted" : ""}
                              />
                            </div>
                            <div>
                              <Select
                                value={field.type}
                                onValueChange={(value) => updateField(fieldKey, { type: value })}
                                disabled={field.system}
                              >
                                <SelectTrigger className={field.system ? "bg-muted" : ""}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {dataTypes.map((type) => (
                                    <SelectItem key={type} value={type}>
                                      {type.toUpperCase()}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          {!field.system && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeField(fieldKey)}
                              className="flex-shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          {field.system && (
                            <Badge variant="outline" className="text-xs flex-shrink-0">
                              System
                            </Badge>
                          )}
                        </div>

                        {/* Collapsible Advanced Options */}
                        {!field.system && (
                          <Collapsible open={expandedFields.has(fieldKey)} onOpenChange={() => toggleFieldExpanded(fieldKey)}>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="w-full justify-between">
                                <span className="text-xs text-muted-foreground">Advanced Options</span>
                                {expandedFields.has(fieldKey) ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-3 pt-2">
                              <div className="grid grid-cols-3 gap-3">
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`pk-${fieldKey}`}
                                    checked={field.primary_key}
                                    onCheckedChange={(checked) => updateField(fieldKey, { primary_key: checked as boolean })}
                                  />
                                  <Label htmlFor={`pk-${fieldKey}`} className="text-xs cursor-pointer">
                                    Primary Key
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`unique-${fieldKey}`}
                                    checked={field.unique || false}
                                    onCheckedChange={(checked) => updateField(fieldKey, { unique: checked as boolean })}
                                  />
                                  <Label htmlFor={`unique-${fieldKey}`} className="text-xs cursor-pointer">
                                    Unique
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`required-${fieldKey}`}
                                    checked={field.required || !field.nullable}
                                    onCheckedChange={(checked) => {
                                      updateField(fieldKey, { required: checked as boolean, nullable: !checked })
                                    }}
                                  />
                                  <Label htmlFor={`required-${fieldKey}`} className="text-xs cursor-pointer">
                                    Required
                                  </Label>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label htmlFor={`min-${fieldKey}`} className="text-xs">
                                    Min Value
                                  </Label>
                                  <Input
                                    id={`min-${fieldKey}`}
                                    type="number"
                                    placeholder="Min"
                                    value={field.constraints.min_value || ""}
                                    onChange={(e) =>
                                      updateField(fieldKey, {
                                        constraints: {
                                          ...field.constraints,
                                          min_value: e.target.value ? Number.parseFloat(e.target.value) : null,
                                        }
                                      })
                                    }
                                    className="h-8 text-xs"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`max-${fieldKey}`} className="text-xs">
                                    Max Value
                                  </Label>
                                  <Input
                                    id={`max-${fieldKey}`}
                                    type="number"
                                    placeholder="Max"
                                    value={field.constraints.max_value || ""}
                                    onChange={(e) =>
                                      updateField(fieldKey, {
                                        constraints: {
                                          ...field.constraints,
                                          max_value: e.target.value ? Number.parseFloat(e.target.value) : null,
                                        }
                                      })
                                    }
                                    className="h-8 text-xs"
                                  />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor={`default-${fieldKey}`} className="text-xs">
                                  Default Value
                                </Label>
                                <Input
                                  id={`default-${fieldKey}`}
                                  placeholder="Default value"
                                  value={field.constraints.default_value || ""}
                                  onChange={(e) => updateField(fieldKey, { constraints: { ...field.constraints, default_value: e.target.value || null } })}
                                  className="h-8 text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor={`validator-${fieldKey}`} className="text-xs">
                                  Validator
                                </Label>
                                <Input
                                  id={`validator-${fieldKey}`}
                                  placeholder="Validator pattern"
                                  value={field.constraints.validator || ""}
                                  onChange={(e) => updateField(fieldKey, { constraints: { ...field.constraints, validator: e.target.value || null } })}
                                  className="h-8 text-xs"
                                />
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}
                      </div>
                    )
                  })}

                  {/* Add Field Button */}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-dashed"
                    onClick={addField}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Field
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
          <Button
            onClick={handleSubmit}
            disabled={
              isLoading ||
              !tableName.trim() ||
              (tableType === "view"
                ? !sqlQuery.trim()
                : fields.filter((f) => !f.system).length === 0)
            }
          >
            {isLoading ? "Creating..." : "Create Entity"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
