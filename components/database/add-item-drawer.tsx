"use client"

import * as React from "react"
import { Edit, X, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { ApiClient, TableMetadata } from "@/lib/api"
import { Badge } from "../ui/badge"
import { useToast } from "@/hooks/use-toast"

interface EditItemDrawerProps {
  table: TableMetadata
  apiClient: ApiClient
  open: boolean
  onClose: () => void
  onItemAdded: (item: any) => void
}

export function AddItemDrawer({ table, apiClient, open, onClose, onItemAdded }: EditItemDrawerProps) {
  const [tableFields, setTableFields] = React.useState<any>([])
  const [formData, setFormData] = React.useState<any>({})
  const [isLoading, setIsLoading] = React.useState(false)
  const [isViewType, setIsViewIsViewType] = React.useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false)
  const { toast } = useToast()

  React.useEffect(() => {
    if (open) {
      setFormData({})
      setHasUnsavedChanges(false)
      setTableFields(table.schema?.fields.filter(f => !isSystemGeneratedField(f)))
      setIsViewIsViewType(table?.type === "view")
    }
  }, [open])

  const prepareRequestBody = (data: Record<string, any>, tableFields: TableField[]): FormData | string => {
    const hasFileField = tableFields.some(f => ["file", "files"].includes(f.type));
    if (!hasFileField) {
      return JSON.stringify(data);
    }

    const formData = new FormData();
    for (const [key, value] of Object.entries(data)) {
      const field = tableFields.find(f => f.name === key);
      if (!field) continue;

      if (field.type === "file") {
        if (value instanceof File) {
          formData.append(key, value);
        }
      } else if (field.type === "files") {
        if (Array.isArray(value)) {
          value.forEach((file, idx) => {
            if (file instanceof File) {
              formData.append(key, file);
            }
          });
        }
      } else {
        formData.append(key, typeof value === "object" ? JSON.stringify(value) : String(value));
      }
    }

    return formData;
  };

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      const body = prepareRequestBody(formData, tableFields);
      console.log("Body: ", body)

      const createdItem = await apiClient.call<any>(`/api/v1/entities/${table.name}`, {
        method: "POST",
        body: body,
      })

      // If the request failed, throw the error here 
      if (createdItem?.error?.length > 0) throw createdItem.error

      onItemAdded(createdItem)
      onClose()

      toast({
        title: "Table Record Created",
        description: `The record was created successfully.`,
        duration: 3000,
      })
    } catch (error) {
      console.error("Failed to create item:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const castToType = (fieldName: string, value: any): any => {
    const field = tableFields?.find((f: any) => f.name === fieldName);
    if (!field) return value;

    const type = field.type;

    try {
      switch (type) {
        case "string":
        case "xml":
          return String(value);

        case "int8":
        case "int16":
        case "int32":
        case "int64":
        case "uint8":
        case "uint16":
        case "uint32":
        case "uint64":
        case "double": {
          return Number(value);
        }

        case "bool":
          if (typeof value === "boolean") return value;
          if (typeof value === "string") return value.toLowerCase() === "true";
          return Boolean(value);

        case "json":
          return typeof value === "object" ? value : JSON.parse(value);

        case "date": {
          const date = new Date(value);
          return isNaN(date.getTime()) ? null : date.toISOString();
        }

        case "file":
          return value instanceof File ? value : null;

        case "files":
          if (Array.isArray(value)) return value;
          if (value instanceof FileList) return Array.from(value);
          return [];

        default:
          return value;
      }
    } catch {
      return value; // fallback on parse errors
    }
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [fieldName]: castToType(fieldName, value),
    }))
    setHasUnsavedChanges(true)
  }

  const isSystemGeneratedField = (field: any) => {
    return field.system && ["id", "created", "updated"].includes(field.name)
  }

  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (confirm("You have unsaved changes. Are you sure you want to close?")) {
        setHasUnsavedChanges(false)
        onClose()
      }
    } else {
      onClose()
    }
  }

  const isIntegralType = (type: string) => {
    switch (type) {
      case "int8":
      case "int16":
      case "int32":
      case "int64":
      case "uint8":
      case "uint16":
      case "uint32":
      case "uint64":
      case "double":
        return true

      default:
        return false
    }
  }

  function formatDateForInput(value: string | Date | undefined): string {
    if (!value) return "";

    const date = typeof value === "string" ? new Date(value) : value;
    if (isNaN(date.getTime())) return "";

    return date.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:MM"
  }

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent side="right" className="w-[700px] max-w-[95vw]">
        <DrawerHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              <DrawerTitle>Add a Record</DrawerTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DrawerDescription>Create a new record in {table.name} table</DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-auto">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6 pb-64">
              <div className="text-sm text-muted-foreground">
                Autogenerated fields for <Badge variant="default" className="text-sm mr-2">
                  {table.name}
                </Badge>table:  <Badge variant="outline" className="text-xs mr-2">
                  id
                </Badge>
                <Badge variant="outline" className="text-xs mr-2">
                  created
                </Badge>
                <Badge variant="outline" className="text-xs mr-2">
                  updated
                </Badge>
              </div>

              {tableFields?.map((field: any) => (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name} className="text-sm font-medium capitalize">
                    {field.name}
                    {(field.required || field.system) && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  {field.type === "bool" ? (
                    <div className="flex items-center gap-2">
                      <Switch
                        id={field.name}
                        checked={!!formData[field.name]}
                        onCheckedChange={(checked: any) => handleFieldChange(field.name, checked)}
                        disabled={(field.type === "view" || isSystemGeneratedField(field))}
                      />
                      <span>{formData[field.name] ? "True" : "False"}</span>
                    </div>
                  ) : field.type === "file" ? (
                    <Input
                      id={field.name}
                      type="file"
                      onChange={(e) => handleFieldChange(field.name, e.target.files?.[0])}
                      disabled={(field.type === "view" || isSystemGeneratedField(field))}
                      className={`w-full ${(field.type === "view" || isSystemGeneratedField(field)) ? "bg-muted" : ""}`}
                    />
                  ) : field.type === "files" ? (
                    <Input
                      id={field.name}
                      type="file"
                      multiple
                      onChange={(e) => handleFieldChange(field.name, e.target.files)}
                      disabled={(field.type === "view" || isSystemGeneratedField(field))}
                      className={`w-full ${(field.type === "view" || isSystemGeneratedField(field)) ? "bg-muted" : ""}`}
                    />
                  ) : isIntegralType(field.type) ? (
                    <Input
                      id={field.name}
                      type="number"
                      value={formData[field.name] || ""}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      disabled={(field.type === "view" || isSystemGeneratedField(field))}
                      className={`w-full ${(field.type === "view" || isSystemGeneratedField(field)) ? "bg-muted" : ""}`}
                      placeholder={`Enter '${field.name}' value`}
                    />
                  ) : field.name === "password" ? (
                    <Input
                      id={field.name}
                      type="password"
                      value={formData[field.name] || ""}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      disabled={(field.type === "view" || isSystemGeneratedField(field))}
                      className={`w-full ${(field.type === "view" || isSystemGeneratedField(field)) ? "bg-muted" : ""}`}
                      placeholder={`Enter '${field.name}' value`}
                    />
                  ) : field.type === "date" ? (
                    <Input
                      id={field.name}
                      type="datetime-local"
                      onFocus={(e) => {
                        // scroll parent container into view
                        e.target.scrollIntoView({ behavior: "auto", block: "center" });
                      }}
                      value={formatDateForInput(formData[field.name])}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      disabled={(field.type === "view" || isSystemGeneratedField(field))}
                      className={`w-full ${(field.type === "view" || isSystemGeneratedField(field)) ? "bg-muted" : ""}`}
                    />
                  ) : (
                    <Input
                      id={field.name}
                      type="text"
                      value={formData[field.name] || ""}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      disabled={(field.type === "view" || isSystemGeneratedField(field))}
                      className={`w-full ${(field.type === "view" || isSystemGeneratedField(field)) ? "bg-muted" : ""}`}
                      placeholder={`Enter '${field.name}' value`}
                    />
                  )}
                </div>
              ))}

              {(!tableFields || tableFields.length === 0) &&
                <p className="text-xs text-muted-foreground">No additional fields for input, proceed to create the record.</p>
              }
            </div>
          </ScrollArea>
        </div>

        <DrawerFooter>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading || isViewType} className="flex-1">
              {isLoading ? "Creating..." : "Create Record"}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
