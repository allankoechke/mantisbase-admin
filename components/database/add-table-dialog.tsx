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

interface AddTableDialogProps {
  apiClient: ApiClient
  onTablesUpdate: (tables: TableMetadata[]) => void
  children?: React.ReactNode
}

interface Field {
  id: string
  name: string
  type: string
  primaryKey: boolean
  nullable: boolean
  unique?: boolean
  isSystem?: boolean
  required?: boolean
  minValue?: number | null
  maxValue?: number | null
  defaultValue?: string | null
  validator?: string | null
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

  // Generate unique ID for fields
  const generateFieldId = () => `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

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
    if (tableType === "base") {
      setFields([
        { id: generateFieldId(), name: "id", type: "string", primaryKey: true, nullable: false, isSystem: true, required: true },
        { id: generateFieldId(), name: "created", type: "date", primaryKey: false, nullable: false, isSystem: true, required: true },
        { id: generateFieldId(), name: "updated", type: "date", primaryKey: false, nullable: false, isSystem: true, required: true },
      ])
    } else if (tableType === "auth") {
      setFields([
        { id: generateFieldId(), name: "id", type: "string", primaryKey: true, nullable: false, isSystem: true, required: true },
        { id: generateFieldId(), name: "email", type: "string", primaryKey: false, nullable: false, isSystem: true, required: true },
        { id: generateFieldId(), name: "password", type: "string", primaryKey: false, nullable: false, isSystem: true, required: true },
        { id: generateFieldId(), name: "created", type: "date", primaryKey: false, nullable: false, isSystem: true, required: true },
        { id: generateFieldId(), name: "updated", type: "date", primaryKey: false, nullable: false, isSystem: true, required: true },
      ])
    } else {
      setFields([])
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
      { id: generateFieldId(), name: "", type: "string", primaryKey: false, nullable: true, isSystem: false, required: false },
    ])
  }

  const removeField = (fieldId: string) => {
    const field = fields.find((f) => f.id === fieldId)
    if (field && !field.isSystem) {
      setFields(fields.filter((f) => f.id !== fieldId))
      setExpandedFields((prev) => {
        const next = new Set(prev)
        next.delete(fieldId)
        return next
      })
    }
  }

  const updateField = (fieldId: string, updates: Partial<Field>) => {
    setFields(fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)))
  }

  const toggleFieldExpanded = (fieldId: string) => {
    setExpandedFields((prev) => {
      const next = new Set(prev)
      if (next.has(fieldId)) {
        next.delete(fieldId)
      } else {
        next.add(fieldId)
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
        const userFields = fields.filter((f) => !f.isSystem && f.name.trim())
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
            (field): TableField => ({
              name: field.name,
              type: field.type,
              primaryKey: field.primaryKey,
              required: field.required || !field.nullable,
              unique: field.unique || false,
              system: field.isSystem || false,
              minValue: field.minValue || null,
              maxValue: field.maxValue || null,
              defaultValue: field.defaultValue || null,
              validator: field.validator || null,
              autoGeneratePattern: null,
              old_name: null,
            }),
          )

      const tableData: Partial<TableMetadata> = {
        name: tableName,
        type: tableType,
        schema: {
          listRule: "",
          getRule: "",
          addRule: "",
          updateRule: "",
          deleteRule: "",
          fields: allFields,
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
        description: `The entity '${tableData.name}' has been created successfully.`,
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
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    draggable={true}
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "border rounded-lg p-4 space-y-3 transition-colors",
                      field.isSystem && "bg-muted/30 border-muted",
                      draggedIndex === index && "opacity-50"
                    )}
                  >
                    {/* Field Header - Name and Type */}
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move flex-shrink-0" />
                      {field.isSystem && (
                        <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <div>
                          <Input
                            placeholder="Field name"
                            value={field.name}
                            onChange={(e) => updateField(field.id, { name: e.target.value })}
                            disabled={field.isSystem}
                            className={field.isSystem ? "bg-muted" : ""}
                          />
                        </div>
                        <div>
                          <Select
                            value={field.type}
                            onValueChange={(value) => updateField(field.id, { type: value })}
                            disabled={field.isSystem}
                          >
                            <SelectTrigger className={field.isSystem ? "bg-muted" : ""}>
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
                      {!field.isSystem && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeField(field.id)}
                          className="flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      {field.isSystem && (
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          System
                        </Badge>
                      )}
                    </div>

                    {/* Collapsible Advanced Options */}
                    {!field.isSystem && (
                      <Collapsible open={expandedFields.has(field.id)} onOpenChange={() => toggleFieldExpanded(field.id)}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="w-full justify-between">
                            <span className="text-xs text-muted-foreground">Advanced Options</span>
                            {expandedFields.has(field.id) ? (
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
                                id={`pk-${field.id}`}
                                checked={field.primaryKey}
                                onCheckedChange={(checked) => updateField(field.id, { primaryKey: checked as boolean })}
                              />
                              <Label htmlFor={`pk-${field.id}`} className="text-xs cursor-pointer">
                                Primary Key
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`unique-${field.id}`}
                                checked={field.unique || false}
                                onCheckedChange={(checked) => updateField(field.id, { unique: checked as boolean })}
                              />
                              <Label htmlFor={`unique-${field.id}`} className="text-xs cursor-pointer">
                                Unique
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`required-${field.id}`}
                                checked={field.required || !field.nullable}
                                onCheckedChange={(checked) => {
                                  updateField(field.id, { required: checked as boolean, nullable: !checked })
                                }}
                              />
                              <Label htmlFor={`required-${field.id}`} className="text-xs cursor-pointer">
                                Required
                              </Label>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label htmlFor={`min-${field.id}`} className="text-xs">
                                Min Value
                              </Label>
                              <Input
                                id={`min-${field.id}`}
                                type="number"
                                placeholder="Min"
                                value={field.minValue || ""}
                                onChange={(e) =>
                                  updateField(field.id, {
                                    minValue: e.target.value ? Number.parseFloat(e.target.value) : null,
                                  })
                                }
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`max-${field.id}`} className="text-xs">
                                Max Value
                              </Label>
                              <Input
                                id={`max-${field.id}`}
                                type="number"
                                placeholder="Max"
                                value={field.maxValue || ""}
                                onChange={(e) =>
                                  updateField(field.id, {
                                    maxValue: e.target.value ? Number.parseFloat(e.target.value) : null,
                                  })
                                }
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`default-${field.id}`} className="text-xs">
                              Default Value
                            </Label>
                            <Input
                              id={`default-${field.id}`}
                              placeholder="Default value"
                              value={field.defaultValue || ""}
                              onChange={(e) => updateField(field.id, { defaultValue: e.target.value || null })}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`validator-${field.id}`} className="text-xs">
                              Validator
                            </Label>
                            <Input
                              id={`validator-${field.id}`}
                              placeholder="Validator pattern"
                              value={field.validator || ""}
                              onChange={(e) => updateField(field.id, { validator: e.target.value || null })}
                              className="h-8 text-xs"
                            />
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                ))}

                {/* Add Field Button */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={addField}
                  disabled={tableType === "view"}
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
                : fields.filter((f) => !f.isSystem).length === 0)
            }
          >
            {isLoading ? "Creating..." : "Create Entity"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
