"use client"

import * as React from "react"
import { Plus, Trash2, Cog, X, ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { ApiClient, TableMetadata } from "@/lib/api"
import { dataTypes } from "@/lib/constants"
import { useToast } from "@/hooks/use-toast"

interface TableConfigDrawerProps {
  table: TableMetadata
  apiClient: ApiClient
  open: boolean
  onClose: () => void
  onTableUpdate: (table: TableMetadata) => void
}

// The update structure for tables is a s follows
/*
{
  name: "", // can be different from existing one
  has_api: <bool>,
  addRule: "",
  getRule: "",
  listRule: "",
  updateRule: "",
  deleteRule: "",
  deletedFields: [], // List of column names to delete
  fields: [], array of fields, changes to particular fields will be effected, new fields will be created
}
*/

// NOTE: We don't support changing of field names yet!
export function TableConfigDrawer({ table, apiClient, open, onClose, onTableUpdate }: TableConfigDrawerProps) {
  const [columns, setColumns] = React.useState<any[]>([])
  const [rules, setRules] = React.useState<{
    list: { mode: string; expr: string }
    get: { mode: string; expr: string }
    add: { mode: string; expr: string }
    update: { mode: string; expr: string }
    delete: { mode: string; expr: string }
  }>({
    list: { mode: "admin", expr: "" },
    get: { mode: "admin", expr: "" },
    add: { mode: "admin", expr: "" },
    update: { mode: "admin", expr: "" },
    delete: { mode: "admin", expr: "" },
  })
  const [isLoading, setIsLoading] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState("schema")
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false)
  const [systemFieldsCollapsed, setSystemFieldsCollapsed] = React.useState(true)
  const [deletedColumns, setDeletedColumns] = React.useState<string[]>([]) // Track deleted field names 
  const { toast } = useToast()

  React.useEffect(() => {
    if (open) {
      // Transform API format (with constraints) to UI format (flat camelCase)
      const transformedColumns = table.schema?.fields.map(col => ({
        ...col,
        old_name: col.name,
        // Flatten constraints for UI
        primaryKey: col.primary_key || false,
        minValue: col.constraints?.min_value || null,
        maxValue: col.constraints?.max_value || null,
        defaultValue: col.constraints?.default_value || null,
        validator: col.constraints?.validator || null,
      })) || []
      setColumns(transformedColumns)
      // Initialize rules with mode and expr from API
      // Convert empty string to "admin" for UI (Select doesn't allow empty string values)
      const normalizeMode = (mode: string | undefined) => {
        return mode === "" || !mode ? "admin" : mode
      }
      setRules({
        list: {
          mode: normalizeMode(table.schema.rules?.list?.mode),
          expr: table.schema.rules?.list?.expr || "",
        },
        get: {
          mode: normalizeMode(table.schema.rules?.get?.mode),
          expr: table.schema.rules?.get?.expr || "",
        },
        add: {
          mode: normalizeMode(table.schema.rules?.add?.mode),
          expr: table.schema.rules?.add?.expr || "",
        },
        update: {
          mode: normalizeMode(table.schema.rules?.update?.mode),
          expr: table.schema.rules?.update?.expr || "",
        },
        delete: {
          mode: normalizeMode(table.schema.rules?.delete?.mode),
          expr: table.schema.rules?.delete?.expr || "",
        },
      })
      setHasUnsavedChanges(false)
      setSystemFieldsCollapsed(true)
      setDeletedColumns([])
    }
  }, [open, table])

  const addColumn = () => {
    setColumns([...columns, { 
      id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: "", 
      type: "string", 
      primary_key: false,
      primaryKey: false, // UI format
      required: true, 
      system: false,
      unique: false,
      constraints: {
        default_value: null,
        max_value: null,
        min_value: null,
        validator: null,
      },
      minValue: null, // UI format
      maxValue: null, // UI format
      defaultValue: null, // UI format
      validator: null, // UI format
      old_name: null 
    }])
    setHasUnsavedChanges(true)
  }

  // Remove existing column by ID
  const removeColumn = (index: number) => {
    const column = columns[index]
    const isSystemColumn = column.system

    if (!(columns.length > 1 && !isSystemColumn))
      return
    const col_name = column.name

    // Ensure the field we are deleting existed/exists in the table already
    if (!deletedColumns.includes(col_name) && isAnExistingField(index)) {
      // Add the column to the delete array
      setDeletedColumns([...deletedColumns, col_name]);
    }
    setColumns(columns.filter((_, i) => i !== index))
  }

  const isAnExistingField = (index: number) => {
    const col_old_name = columns[index]?.old_name
    if (!col_old_name) return false;
    for (const f of table.schema.fields) {
      if (f.name === col_old_name) return true;
    }

    return false;
  }

  // Update existing column data
  const updateColumn = (index: number, field: string, value: any) => {
    const updatedColumns = columns.map((col, i) => {
      if (i === index) {
        var updated = col
        updated[field] = value
        return updated;
      }

      return col
    })

    setColumns(updatedColumns)
    setHasUnsavedChanges(true)
  }

  const handleSaveSchema = async () => {
    setIsLoading(true)
    try {
      // Transform UI format (camelCase flat) to API format (with constraints and snake_case)
      const transformedFields = columns.map((col: any) => ({
        id: col.id,
        name: col.name,
        type: col.type,
        primary_key: col.primaryKey !== undefined ? col.primaryKey : col.primary_key,
        required: col.required,
        system: col.system || false,
        unique: col.unique || false,
        constraints: {
          default_value: col.defaultValue !== undefined ? col.defaultValue : (col.constraints?.default_value || null),
          max_value: col.maxValue !== undefined ? col.maxValue : (col.constraints?.max_value || null),
          min_value: col.minValue !== undefined ? col.minValue : (col.constraints?.min_value || null),
          validator: col.validator !== undefined ? col.validator : (col.constraints?.validator || null),
        },
        ...(col.old_name && { old_name: col.old_name }),
      }))
      
      const body = { fields: transformedFields, deletedFields: deletedColumns };
      console.log(body)
      // return
      const updatedTable = await apiClient.call<TableMetadata>(`/api/v1/schemas/${table.schema.name}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      })

      // If the request failed, throw the error here 
      if ((updatedTable as any)?.error?.length > 0) throw (updatedTable as any).error

      onTableUpdate(updatedTable)
      toast({
        title: "Table Updated",
        description: "Table fields updated successfully.",
        duration: 3000,
      })
    } catch (error) {
      console.error("Failed to update schema:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Update rule changes
  const handleSaveRules = async () => {
    setIsLoading(true)
    try {
      const updatedTable = await apiClient.call<TableMetadata>(`/api/v1/schemas/${table.schema.name}`, {
        method: "PATCH",
        body: JSON.stringify({
          rules: {
            list: {
              mode: rules.list.mode === "admin" ? "" : (rules.list.mode || ""),
              expr: rules.list.expr || "",
            },
            get: {
              mode: rules.get.mode === "admin" ? "" : (rules.get.mode || ""),
              expr: rules.get.expr || "",
            },
            add: {
              mode: rules.add.mode === "admin" ? "" : (rules.add.mode || ""),
              expr: rules.add.expr || "",
            },
            update: {
              mode: rules.update.mode === "admin" ? "" : (rules.update.mode || ""),
              expr: rules.update.expr || "",
            },
            delete: {
              mode: rules.delete.mode === "admin" ? "" : (rules.delete.mode || ""),
              expr: rules.delete.expr || "",
            },
          },
        }),
      })

      // If the request failed, throw the error here 
      if ((updatedTable as any)?.error?.length > 0) throw (updatedTable as any).error

      onTableUpdate(updatedTable)
      toast({
        title: "Table Updated",
        description: "Table access rules updated successfully!",
        duration: 3000,
      })
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error("Failed to update rules:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update access rules",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Helper to update a specific rule
  const updateRule = (ruleKey: keyof typeof rules, field: "mode" | "expr", value: string) => {
    setRules({
      ...rules,
      [ruleKey]: {
        ...rules[ruleKey],
        [field]: value,
      },
    })
    setHasUnsavedChanges(true)
  }

  const isSystemColumn = (column: any) => {
    return column.system
  }

  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (confirm("You have unsaved changes. Are you sure you want to close?")) {
        setHasUnsavedChanges(false)
        setDeletedColumns([])
        onClose()
      }
    } else {
      onClose()
    }
  }

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent side="right" className="w-[900px] max-w-[95vw]">
        <DrawerHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cog className="h-5 w-5" />
              <DrawerTitle>Configure {table.schema.name} Table</DrawerTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DrawerDescription>Manage table schema and access control rules</DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="schema">Schema</TabsTrigger>
                  <TabsTrigger value="rules">Access Rules</TabsTrigger>
                </TabsList>

                <TabsContent value="schema" className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-medium">Table Structure</h4>
                      <p className="text-sm text-muted-foreground">Modify columns and their properties</p>
                    </div>
                    {table.schema.type !== "view" && (
                      <Button type="button" variant="outline" size="sm" onClick={addColumn}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Column
                      </Button>
                    )}
                  </div>

                  {table.schema.type === "view" ? (
                    <div className="p-4 bg-muted rounded-lg">
                      <h5 className="font-medium mb-3">SQL Query</h5>
                      <ScrollArea className="h-32">
                        <pre className="text-sm whitespace-pre-wrap">
                          <code>{table.schema?.sql}</code>
                        </pre>
                      </ScrollArea>
                    </div>
                  ) : (
                    <>
                      {/* System Fields - Collapsible */}
                      {columns.filter((col) => isSystemColumn(col)).length > 0 && (
                        <Collapsible
                          open={!systemFieldsCollapsed}
                          onOpenChange={(open) => setSystemFieldsCollapsed(!open)}
                        >
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" className="w-full justify-between p-2 mb-4">
                              <span className="text-sm font-medium">
                                System Fields ({columns.filter((col) => isSystemColumn(col)).length})
                              </span>
                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${systemFieldsCollapsed ? "" : "rotate-180"}`}
                              />
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="space-y-4 mb-6">
                            {columns.map((column, index) => {
                              const isSystem = isSystemColumn(column)
                              if (!isSystem) return null
                              return (
                                <div key={index} className="border rounded-lg bg-muted/50">
                                  <div className="p-4 space-y-4">
                                    {/* Basic Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      <div className="md:col-span-2">
                                        <Label className="text-sm font-medium mb-2 block">Column Name</Label>
                                        <div className="flex items-center gap-2">
                                          <Input
                                            placeholder="Column name"
                                            value={column.name}
                                            onChange={(e) => updateColumn(index, "name", e.target.value)}
                                            disabled={isSystem}
                                            className={`flex-1 ${isSystem ? "bg-muted" : ""}`}
                                          />
                                          {isSystem && (
                                            <Badge variant="outline" className="text-xs">
                                              System
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                      <div>
                                        <Label className="text-sm font-medium mb-2 block">Data Type</Label>
                                        <Select
                                          value={column.type}
                                          onValueChange={(value) => updateColumn(index, "type", value)}
                                          disabled={isSystem}
                                        >
                                          <SelectTrigger className={isSystem ? "bg-muted" : ""}>
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

                                    {/* Basic Properties */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                      <div className="flex items-center space-x-2">
                                        <input
                                          type="checkbox"
                                          id={`primary-${index}`}
                                          checked={column.primaryKey}
                                          onChange={(e) => updateColumn(index, "primaryKey", e.target.checked)}
                                          disabled={isSystem}
                                          className="rounded"
                                        />
                                        <Label htmlFor={`primary-${index}`} className="text-sm">
                                          Primary Key
                                        </Label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <input
                                          type="checkbox"
                                          id={`required-${index}`}
                                          checked={column.required}
                                          onChange={(e) => updateColumn(index, "required", e.target.checked)}
                                          disabled={isSystem}
                                          className="rounded"
                                        />
                                        <Label htmlFor={`required-${index}`} className="text-sm">
                                          Required
                                        </Label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <input
                                          type="checkbox"
                                          id={`unique-${index}`}
                                          checked={column.unique || false}
                                          onChange={(e) => updateColumn(index, "unique", e.target.checked)}
                                          disabled={isSystem}
                                          className="rounded"
                                        />
                                        <Label htmlFor={`unique-${index}`} className="text-sm">
                                          Unique
                                        </Label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <input
                                          type="checkbox"
                                          id={`files-${index}`}
                                          checked={column.isFile || false}
                                          onChange={(e) => updateColumn(index, "isFile", e.target.checked)}
                                          disabled={isSystem}
                                          className="rounded"
                                        />
                                        <Label htmlFor={`files-${index}`} className="text-sm">
                                          File Field
                                        </Label>
                                      </div>
                                    </div>

                                    {/* Advanced Options - Collapsible */}
                                    <Collapsible>
                                      <CollapsibleTrigger asChild>
                                        <Button variant="ghost" size="sm" className="w-full justify-between p-2">
                                          <span className="text-sm">Advanced Options</span>
                                          <ChevronDown className="h-4 w-4" />
                                        </Button>
                                      </CollapsibleTrigger>
                                      <CollapsibleContent className="space-y-4 pt-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div>
                                            <Label className="text-sm font-medium mb-2 block">Default Value</Label>
                                            <Input
                                              placeholder="Default value"
                                              value={column.defaultValue || ""}
                                              onChange={(e) => updateColumn(index, "defaultValue", e.target.value)}
                                              disabled={isSystem}
                                              className={isSystem ? "bg-muted" : ""}
                                            />
                                          </div>
                                          <div>
                                            <Label className="text-sm font-medium mb-2 block">Max Length</Label>
                                            <Input
                                              type="number"
                                              placeholder="Max length"
                                              value={column.maxValue || ""}
                                              onChange={(e) => updateColumn(index, "maxValue", e.target.value)}
                                              disabled={isSystem}
                                              className={isSystem ? "bg-muted" : ""}
                                            />
                                          </div>
                                          <div>
                                            <Label className="text-sm font-medium mb-2 block">Min Length</Label>
                                            <Input
                                              type="number"
                                              placeholder="Min length"
                                              value={column.minValue || ""}
                                              onChange={(e) => updateColumn(index, "minValue", e.target.value)}
                                              disabled={isSystem}
                                              className={isSystem ? "bg-muted" : ""}
                                            />
                                          </div>
                                          <div>
                                            <Label className="text-sm font-medium mb-2 block">
                                              Auto Generate Pattern
                                            </Label>
                                            <Input
                                              placeholder="Auto Generate Pattern"
                                              value={column.autoGeneratePattern || ""}
                                              onChange={(e) =>
                                                updateColumn(index, "autoGeneratePattern", e.target.value)
                                              }
                                              disabled={isSystem}
                                              className={isSystem ? "bg-muted" : ""}
                                            />
                                          </div>
                                        </div>
                                        <div>
                                          <Label className="text-sm font-medium mb-2 block">Validator</Label>
                                          <Textarea
                                            placeholder="Column validator"
                                            value={column.validator || ""}
                                            onChange={(e) => updateColumn(index, "validator", e.target.value)}
                                            disabled={isSystem}
                                            className={isSystem ? "bg-muted" : ""}
                                            rows={2}
                                          />
                                        </div>
                                        <div>
                                          <Label className="text-sm font-medium mb-2 block">Description</Label>
                                          <Textarea
                                            placeholder="Column description"
                                            value={column.description || ""}
                                            onChange={(e) => updateColumn(index, "description", e.target.value)}
                                            disabled={isSystem}
                                            className={isSystem ? "bg-muted" : ""}
                                            rows={2}
                                          />
                                        </div>
                                      </CollapsibleContent>
                                    </Collapsible>

                                    {/* Delete Button */}
                                    <div className="flex justify-end pt-2 border-t">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeColumn(index)}
                                        disabled={columns.length === 1 || isSystem}
                                        className={`text-destructive hover:text-destructive ${isSystem ? "opacity-30" : ""}`}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Remove Column
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </CollapsibleContent>
                        </Collapsible>
                      )}

                      {/* Regular Fields */}
                      <div className="space-y-4">
                        {columns.map((column, index) => {
                          const isSystem = isSystemColumn(column)
                          if (isSystem) return null // Skip system fields as they're in collapsible section
                          return (
                            <div key={index} className="border rounded-lg">
                              <div className="p-4 space-y-4">
                                {/* Basic Info */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="md:col-span-2">
                                    <Label className="text-sm font-medium mb-2 block">Column Name</Label>
                                    <div className="flex items-center gap-2">
                                      <Input
                                        placeholder="Column name"
                                        value={column.name}
                                        onChange={(e) => updateColumn(index, "name", e.target.value)}
                                        disabled={isSystem}
                                        className={`flex-1 ${isSystem ? "bg-muted" : ""}`}
                                      />
                                      {isSystem && (
                                        <Badge variant="outline" className="text-xs">
                                          System
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium mb-2 block">Data Type</Label>
                                    <Select
                                      value={column.type}
                                      onValueChange={(value) => updateColumn(index, "type", value)}
                                      disabled={isSystem}
                                    >
                                      <SelectTrigger className={isSystem ? "bg-muted" : ""}>
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

                                {/* Basic Properties */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      id={`primary-${index}`}
                                      checked={column.primaryKey}
                                      onChange={(e) => updateColumn(index, "primaryKey", e.target.checked)}
                                      disabled={isSystem}
                                      className="rounded"
                                    />
                                    <Label htmlFor={`primary-${index}`} className="text-sm">
                                      Primary Key
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      id={`required-${index}`}
                                      checked={column.required}
                                      onChange={(e) => updateColumn(index, "required", e.target.checked)}
                                      disabled={isSystem}
                                      className="rounded"
                                    />
                                    <Label htmlFor={`required-${index}`} className="text-sm">
                                      Required
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      id={`unique-${index}`}
                                      checked={column.unique || false}
                                      onChange={(e) => updateColumn(index, "unique", e.target.checked)}
                                      disabled={isSystem}
                                      className="rounded"
                                    />
                                    <Label htmlFor={`unique-${index}`} className="text-sm">
                                      Unique
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      id={`files-${index}`}
                                      checked={column.isFile || false}
                                      onChange={(e) => updateColumn(index, "isFile", e.target.checked)}
                                      disabled={isSystem}
                                      className="rounded"
                                    />
                                    <Label htmlFor={`files-${index}`} className="text-sm">
                                      File Field
                                    </Label>
                                  </div>
                                </div>

                                {/* Advanced Options - Collapsible */}
                                <Collapsible>
                                  <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm" className="w-full justify-between p-2">
                                      <span className="text-sm">Advanced Options</span>
                                      <ChevronDown className="h-4 w-4" />
                                    </Button>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent className="space-y-4 pt-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <Label className="text-sm font-medium mb-2 block">Default Value</Label>
                                        <Input
                                          placeholder="Default value"
                                          value={column.defaultValue || ""}
                                          onChange={(e) => updateColumn(index, "defaultValue", e.target.value)}
                                          disabled={isSystem}
                                          className={isSystem ? "bg-muted" : ""}
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-sm font-medium mb-2 block">Max Length</Label>
                                        <Input
                                          type="number"
                                          placeholder="Max length"
                                          value={column.maxValue || ""}
                                          onChange={(e) => updateColumn(index, "maxValue", e.target.value)}
                                          disabled={isSystem}
                                          className={isSystem ? "bg-muted" : ""}
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-sm font-medium mb-2 block">Min Length</Label>
                                        <Input
                                          type="number"
                                          placeholder="Min length"
                                          value={column.minValue || ""}
                                          onChange={(e) => updateColumn(index, "minValue", e.target.value)}
                                          disabled={isSystem}
                                          className={isSystem ? "bg-muted" : ""}
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-sm font-medium mb-2 block">Auto Generate Pattern</Label>
                                        <Input
                                          placeholder="Auto Generate Pattern"
                                          value={column.autoGeneratePattern || ""}
                                          onChange={(e) => updateColumn(index, "autoGeneratePattern", e.target.value)}
                                          disabled={isSystem}
                                          className={isSystem ? "bg-muted" : ""}
                                        />
                                      </div>
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium mb-2 block">Validator</Label>
                                      <Textarea
                                        placeholder="Column validator"
                                        value={column.validator || ""}
                                        onChange={(e) => updateColumn(index, "validator", e.target.value)}
                                        disabled={isSystem}
                                        className={isSystem ? "bg-muted" : ""}
                                        rows={2}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium mb-2 block">Description</Label>
                                      <Textarea
                                        placeholder="Column description"
                                        value={column.description || ""}
                                        onChange={(e) => updateColumn(index, "description", e.target.value)}
                                        disabled={isSystem}
                                        className={isSystem ? "bg-muted" : ""}
                                        rows={2}
                                      />
                                    </div>
                                  </CollapsibleContent>
                                </Collapsible>

                                {/* Delete Button */}
                                <div className="flex justify-end pt-2 border-t">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeColumn(index)}
                                    disabled={columns.length === 1 || isSystem}
                                    className={`text-destructive hover:text-destructive ${isSystem ? "opacity-30" : ""}`}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Remove Column
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}

                  {table.schema.type !== "view" && (
                    <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                      <div>
                        <Badge variant="outline" className="text-xs mr-2">
                          System
                        </Badge>
                        System columns are automatically managed and cannot be modified.
                      </div>
                      <div className="mt-2"></div>
                      <div>
                        <Badge variant="outline" className="text-xs mr-2">
                          Table Type
                        </Badge>
                        Once a table is created, we dont support changing table field types.
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="rules" className="space-y-6">
                  <div>
                    <h4 className="text-lg font-medium mb-2">Access Control Rules</h4>
                    <p className="text-sm text-muted-foreground mb-6">
                      Configure who can access and modify records in this entity
                    </p>
                    <div className="space-y-6">
                      {/* List Rule */}
                      <div className="border rounded-lg p-4 space-y-3">
                        <div>
                          <Label htmlFor="list-mode" className="text-sm font-medium">
                            List Records
                          </Label>
                          <p className="text-xs text-muted-foreground mt-0.5">Controls who can list all records</p>
                        </div>
                        <div className="space-y-2">
                          <Select
                            value={rules.list.mode}
                            onValueChange={(value) => updateRule("list", "mode", value)}
                          >
                            <SelectTrigger id="list-mode" className="w-full">
                              <SelectValue placeholder="Select access mode" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin Only (Default)</SelectItem>
                              <SelectItem value="public">Public</SelectItem>
                              <SelectItem value="auth">Authenticated Users</SelectItem>
                              <SelectItem value="custom">Custom Expression</SelectItem>
                            </SelectContent>
                          </Select>
                          {rules.list.mode === "custom" && (
                            <div>
                              <Textarea
                                placeholder='e.g., "auth.role == \"admin\"" or "auth.id == record.owner_id"'
                                value={rules.list.expr}
                                onChange={(e) => updateRule("list", "expr", e.target.value)}
                                className="mt-2 font-mono text-sm"
                                rows={3}
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Enter a custom expression to evaluate access
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Get Rule */}
                      <div className="border rounded-lg p-4 space-y-3">
                        <div>
                          <Label htmlFor="get-mode" className="text-sm font-medium">
                            Get Record
                          </Label>
                          <p className="text-xs text-muted-foreground mt-0.5">Controls who can view individual records</p>
                        </div>
                        <div className="space-y-2">
                          <Select
                            value={rules.get.mode}
                            onValueChange={(value) => updateRule("get", "mode", value)}
                          >
                            <SelectTrigger id="get-mode" className="w-full">
                              <SelectValue placeholder="Select access mode" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin Only (Default)</SelectItem>
                              <SelectItem value="public">Public</SelectItem>
                              <SelectItem value="auth">Authenticated Users</SelectItem>
                              <SelectItem value="custom">Custom Expression</SelectItem>
                            </SelectContent>
                          </Select>
                          {rules.get.mode === "custom" && (
                            <div>
                              <Textarea
                                placeholder='e.g., "auth.id == record.user_id"'
                                value={rules.get.expr}
                                onChange={(e) => updateRule("get", "expr", e.target.value)}
                                className="mt-2 font-mono text-sm"
                                rows={3}
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Enter a custom expression to evaluate access
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {table.schema.type !== "view" && (
                        <>
                          {/* Add Rule */}
                          <div className="border rounded-lg p-4 space-y-3">
                            <div>
                              <Label htmlFor="add-mode" className="text-sm font-medium">
                                Add Record
                              </Label>
                              <p className="text-xs text-muted-foreground mt-0.5">Controls who can create new records</p>
                            </div>
                            <div className="space-y-2">
                              <Select
                                value={rules.add.mode}
                                onValueChange={(value) => updateRule("add", "mode", value)}
                              >
                                <SelectTrigger id="add-mode" className="w-full">
                                  <SelectValue placeholder="Select access mode" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin Only (Default)</SelectItem>
                                  <SelectItem value="public">Public</SelectItem>
                                  <SelectItem value="auth">Authenticated Users</SelectItem>
                                  <SelectItem value="custom">Custom Expression</SelectItem>
                                </SelectContent>
                              </Select>
                              {rules.add.mode === "custom" && (
                                <div>
                                  <Textarea
                                    placeholder='e.g., "auth.id != None" or "auth.role == \"admin\""'
                                    value={rules.add.expr}
                                    onChange={(e) => updateRule("add", "expr", e.target.value)}
                                    className="mt-2 font-mono text-sm"
                                    rows={3}
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Enter a custom expression to evaluate access
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Update Rule */}
                          <div className="border rounded-lg p-4 space-y-3">
                            <div>
                              <Label htmlFor="update-mode" className="text-sm font-medium">
                                Update Record
                              </Label>
                              <p className="text-xs text-muted-foreground mt-0.5">Controls who can modify existing records</p>
                            </div>
                            <div className="space-y-2">
                              <Select
                                value={rules.update.mode}
                                onValueChange={(value) => updateRule("update", "mode", value)}
                              >
                                <SelectTrigger id="update-mode" className="w-full">
                                  <SelectValue placeholder="Select access mode" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin Only (Default)</SelectItem>
                                  <SelectItem value="public">Public</SelectItem>
                                  <SelectItem value="auth">Authenticated Users</SelectItem>
                                  <SelectItem value="custom">Custom Expression</SelectItem>
                                </SelectContent>
                              </Select>
                              {rules.update.mode === "custom" && (
                                <div>
                                  <Textarea
                                    placeholder='e.g., "auth.id == record.user_id"'
                                    value={rules.update.expr}
                                    onChange={(e) => updateRule("update", "expr", e.target.value)}
                                    className="mt-2 font-mono text-sm"
                                    rows={3}
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Enter a custom expression to evaluate access
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Delete Rule */}
                          <div className="border rounded-lg p-4 space-y-3">
                            <div>
                              <Label htmlFor="delete-mode" className="text-sm font-medium">
                                Delete Record
                              </Label>
                              <p className="text-xs text-muted-foreground mt-0.5">Controls who can delete records</p>
                            </div>
                            <div className="space-y-2">
                              <Select
                                value={rules.delete.mode}
                                onValueChange={(value) => updateRule("delete", "mode", value)}
                              >
                                <SelectTrigger id="delete-mode" className="w-full">
                                  <SelectValue placeholder="Select access mode" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin Only (Default)</SelectItem>
                                  <SelectItem value="public">Public</SelectItem>
                                  <SelectItem value="auth">Authenticated Users</SelectItem>
                                  <SelectItem value="custom">Custom Expression</SelectItem>
                                </SelectContent>
                              </Select>
                              {rules.delete.mode === "custom" && (
                                <div>
                                  <Textarea
                                    placeholder='e.g., "auth.role == \"admin\"" or "auth.id == record.owner_id"'
                                    value={rules.delete.expr}
                                    onChange={(e) => updateRule("delete", "expr", e.target.value)}
                                    className="mt-2 font-mono text-sm"
                                    rows={3}
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Enter a custom expression to evaluate access
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="mt-6 p-4 bg-muted rounded-lg">
                      <h5 className="font-medium mb-3 text-sm">Access Mode Guide</h5>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-start gap-2">
                          <Badge variant="outline" className="text-xs mt-0.5">Admin Only</Badge>
                          <p>Only administrators can access (default). Leave mode empty.</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <Badge variant="outline" className="text-xs mt-0.5">Public</Badge>
                          <p>Anyone can access, no authentication required.</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <Badge variant="outline" className="text-xs mt-0.5">Authenticated</Badge>
                          <p>Any logged-in user can access.</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <Badge variant="outline" className="text-xs mt-0.5">Custom</Badge>
                          <p>Evaluate a custom expression to determine access. Use <code className="bg-background px-1 py-0.5 rounded text-xs">auth</code> for current user and <code className="bg-background px-1 py-0.5 rounded text-xs">record</code> for the record being accessed.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        </div>

        <DrawerFooter>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={activeTab === "schema" ? handleSaveSchema : handleSaveRules}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? "Saving..." : `Save ${activeTab === "schema" ? "Schema" : "Rules"}`}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
