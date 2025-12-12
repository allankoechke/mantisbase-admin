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
  const [columns, setColumns] = React.useState([])
  const [rules, setRules] = React.useState({})
  const [isLoading, setIsLoading] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState("schema")
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false)
  const [systemFieldsCollapsed, setSystemFieldsCollapsed] = React.useState(true)
  const [deletedColumns, setDeletedColumns] = React.useState([]) // Track deleted field names, we'll 
  const { toast } = useToast()

  React.useEffect(() => {
    if (open) {
      setColumns(table.schema?.fields.map(col => ({ ...col, old_name: col.name })) || [])
      setRules({ addRule: table.schema.rules.add, listRule: table.schema.rules.list, getRule: table.schema.rules.get, updateRule: table.schema.rules.update, deletRule: table.schema.rules.delete })
      setHasUnsavedChanges(false)
      setSystemFieldsCollapsed(true)
      setDeletedColumns([])
    }
  }, [open, table])

  const addColumn = () => {
    setColumns([...columns, { name: "", type: "string", primaryKey: false, required: true, old_name: null }])
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
      const body = { fields: columns, deletedFields: deletedColumns };
      console.log(body)
      // return
      const updatedTable = await apiClient.call<TableMetadata>(`/api/v1/tables/${table.id}`, {
        method: "PATCH",
        body: JSON.stringify({ fields: columns, deletedFields: deletedColumns }),
      })

      // If the request failed, throw the error here 
      if (updatedTable?.error?.length > 0) throw updatedTable.error

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
      const updatedTable = await apiClient.call<TableMetadata>(`/api/v1/tables/${table.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          listRule: rules.listRule,
          getRule: rules.getRule,
          addRule: rules.addRule,
          updateRule: rules.updateRule,
          deleteRule: rules.deleteRule,
        }),
      })

      // If the request failed, throw the error here 
      if (updatedTable?.error?.length > 0) throw updatedTable.error

      onTableUpdate(updatedTable)
      toast({
        title: "Table Updated",
        description: "Table access rules updated successfully!",
        duration: 3000,
      })
    } catch (error) {
      console.error("Failed to update rules:", error)
    } finally {
      setIsLoading(false)
    }
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
                    <h4 className="text-lg font-medium mb-4">Access Control Rules</h4>
                    <div className="space-y-6">
                      <div>
                        <Label htmlFor="list-rule" className="text-sm font-medium">
                          List Rule
                        </Label>
                        <Textarea
                          id="list-rule"
                          placeholder='e.g., "True", "auth.id != None", ""'
                          value={rules?.listRule}
                          onChange={(e) => setRules({ ...rules, listRule: e.target.value })}
                          className="mt-2"
                          rows={3}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Controls who can list records</p>
                      </div>

                      <div>
                        <Label htmlFor="get-rule" className="text-sm font-medium">
                          Get Rule
                        </Label>
                        <Textarea
                          id="get-rule"
                          placeholder='e.g., "True", "auth.id == record.user_id"'
                          value={rules?.getRule}
                          onChange={(e) => setRules({ ...rules, getRule: e.target.value })}
                          className="mt-2"
                          rows={3}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Controls who can view individual records</p>
                      </div>

                      {table.schema.type !== "view" && (
                        <>
                          <div>
                            <Label htmlFor="add-rule" className="text-sm font-medium">
                              Add Rule
                            </Label>
                            <Textarea
                              id="add-rule"
                              placeholder='e.g., "auth.id != None", "auth.role == "admin""'
                              value={rules?.addRule}
                              onChange={(e) => setRules({ ...rules, addRule: e.target.value })}
                              className="mt-2"
                              rows={3}
                            />
                            <p className="text-xs text-muted-foreground mt-1">Controls who can create new records</p>
                          </div>

                          <div>
                            <Label htmlFor="update-rule" className="text-sm font-medium">
                              Update Rule
                            </Label>
                            <Textarea
                              id="update-rule"
                              placeholder='e.g., "auth.id == record.user_id", ""'
                              value={rules?.updateRule}
                              onChange={(e) => setRules({ ...rules, updateRule: e.target.value })}
                              className="mt-2"
                              rows={3}
                            />
                            <p className="text-xs text-muted-foreground mt-1">Controls who can update records</p>
                          </div>

                          <div>
                            <Label htmlFor="delete-rule" className="text-sm font-medium">
                              Delete Rule
                            </Label>
                            <Textarea
                              id="delete-rule"
                              placeholder='e.g., "auth.role == "admin"", ""'
                              value={rules?.deleteRule}
                              onChange={(e) => setRules({ ...rules, deleteRule: e.target.value })}
                              className="mt-2"
                              rows={3}
                            />
                            <p className="text-xs text-muted-foreground mt-1">Controls who can delete records</p>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="mt-6 p-4 bg-muted rounded-lg">
                      <h5 className="font-medium mb-3">Rule Examples</h5>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="grid grid-cols-1 gap-2">
                          <p>
                            <code className="bg-background px-2 py-1 rounded">""</code> - Admin access only
                          </p>
                          <p>
                            <code className="bg-background px-2 py-1 rounded">"True"</code> - Public access
                          </p>
                          <p>
                            <code className="bg-background px-2 py-1 rounded">"auth.id != None"</code> - Authenticated
                            users only
                          </p>
                          <p>
                            <code className="bg-background px-2 py-1 rounded">"auth.id == record.user_id"</code> - Owner
                            access only
                          </p>
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
