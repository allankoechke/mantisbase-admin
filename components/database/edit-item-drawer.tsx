"use client"

import * as React from "react"
import { Edit, X } from "lucide-react"

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
import { ApiClient, TableMetadata, getApiBaseUrl } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface EditItemDrawerProps {
  table: TableMetadata
  item: any
  apiClient: ApiClient
  open: boolean
  onClose: () => void
  onItemUpdate: (item: any) => void
}

const FilePreviewField = ({
  field,
  value,
  onChange,
  onDelete,
  multiple = false,
  table,
}: {
  field: any;
  value: any;
  onChange: (val: File | File[] | null) => void;
  onDelete: (index: number) => void;
  multiple?: boolean;
  table: TableMetadata;
}) => {
  const files = Array.isArray(value) ? value : value ? [value] : [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files ? Array.from(e.target.files) : [];
    if (multiple) {
      onChange([...files, ...selected]);
    } else {
      onChange(selected[0] || null);
    }
  };

  const getFileUrl = (file: File | string): string => {
    if (typeof file === "string") {
      return `${getApiBaseUrl()}/api/files/${table.schema.name}/${encodeURIComponent(file)}`;
    }
    return URL.createObjectURL(file); // for newly selected files
  };

  const getFileName = (file: File | string): string => {
    return typeof file === "string" ? file : file.name;
  };

  const isImageFile = (file: File | string): boolean => {
    const name = getFileName(file);
    return name.match(/\.(jpg|jpeg|png|gif|webp)$/i) !== null;
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        {files.map((file, idx) => {
          const url = getFileUrl(file);
          const isImage = isImageFile(file);

          return (
            <div key={idx} className="relative group w-24 h-24 border rounded-md overflow-hidden">
              {isImage ? (
                <img src={url} alt="Preview" className="object-cover w-full h-full" />
              ) : (
                <div className="flex items-center justify-center h-full text-xs p-2 text-center">
                  📄 {file.name || "file"}
                </div>
              )}
              <div
                onClick={() => onDelete(idx)}
                className="absolute top-1 right-1 bg-white/80 rounded-full p-1 cursor-pointer hidden group-hover:block"
              >
                ❌
              </div>
            </div>
          );
        })}
      </div>

      <Input
        type="file"
        multiple={multiple}
        onChange={handleFileChange}
        className="w-fit"
        placeholder={`Enter '${field.type}' value`}
      />
    </div>
  );
};


export function EditItemDrawer({ table, item, apiClient, open, onClose, onItemUpdate }: EditItemDrawerProps) {
  const [tableFields, setTableFields] = React.useState<any>([])
  const [formData, setFormData] = React.useState<any>({})
  const [isLoading, setIsLoading] = React.useState(false)
  const [isViewType, setIsViewIsViewType] = React.useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false)
  const { toast } = useToast()

  React.useEffect(() => {
    if (open && item) {
      setFormData({ ...item })
      setHasUnsavedChanges(false)
      setTableFields(table.schema?.fields.filter(f => !isSystemGeneratedField(f)))
      setIsViewIsViewType(table?.schema?.type === "view")
    }
  }, [open, item])

  const prepareRequestBody = (data: Record<string, any>, tableFields: TableField[]): FormData | string => {
    const hasFileField = tableFields.some(f => ["file", "files"].includes(f.type));
    if (!hasFileField) {
      return JSON.stringify(data);
    }

    const formData = new FormData();
    for (const [key, value] of Object.entries(data)) {
      const field = tableFields.find(f => f.name === key);
      if (!field) continue;
      if (!value) {
        formData.append(key, "");
        continue; 
      }

      if (field.type === "file") {
        if (value instanceof File) {
          formData.append(key, value);
        }
      } else if (field.type === "files") {
        if (!value) {
          formData.append(key, value);
        }
        else if (Array.isArray(value)) {
          var files = value.filter(v => v instanceof File);
          var arr = value.filter(v => !(v instanceof File));
          files.forEach((file, idx) => {
            if (file instanceof File) {
              formData.append(key, file);
            }
          });

          // Append the array of non-file values as a JSON string
          if (arr.length > 0) {
            formData.append(key, JSON.stringify(arr));
          } else {
            // Append empty string only if no files were added
            if (files.length === 0) {
              formData.append(key, "");
            }
          }
        }
      } else {
        formData.append(key, value);
      }
    }

    return formData;
  };

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      const body = prepareRequestBody(formData, tableFields);
      console.log("Body to send:", body);
      
      if (!body) {
        toast({
          title: "Error",
          description: "No data to update.",
          variant: "destructive",
          duration: 3000,
        });
        setIsLoading(false);
        return;
      }
      
      const updatedItem = await apiClient.call<any>(`/api/v1/entities/${table?.schema?.name}/${formData["id"]}`, {
        method: "PATCH",
        body: body,
      })

      // If the request failed, throw the error here 
      if (updatedItem?.error?.length > 0) throw updatedItem.error

      onItemUpdate(updatedItem)
      onClose()

      toast({
        title: "Table Record Updated",
        description: "Table record was updated successfully.",
        duration: 3000,
      })
    } catch (error) {
      console.error("Failed to update item:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const castToType = (fieldName: string, value: any): any => {
    const field = tableFields?.find((f: any) => f.name === fieldName);
    if (!field) return value;
    if (!value) return null; // handle null or undefined values

    const type = field.type;

    try {
      switch (type) {
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
    const v = castToType(fieldName, value);
    console.log(`Field changed: ${fieldName}, Value: ${v}, Type: ${typeof v}`);
    setFormData((prev: any) => ({
      ...prev,
      [fieldName]: v,
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

  const handleFileDelete = (fieldName: string, index: number) => {
    const value = formData[fieldName];
    const updated = Array.isArray(value)
      ? value.filter((_, i) => i !== index)
      : null;

    // Update the form data with the new value
    handleFieldChange(fieldName, updated);
  };

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
              <DrawerTitle>Edit Record</DrawerTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DrawerDescription>Edit record in {table.schema.name} table</DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {table.schema.fields?.map((field) => {
                const isDisabled = (field.type === "view" || isSystemGeneratedField(field));
                const value = formData[field.name];
                const isFileField = field.type === "file" || field.type === "files";

                return (
                  <div key={field.name} className="space-y-2">
                    <Label htmlFor={field.name} className="text-sm font-medium capitalize">
                      {field.name}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>

                    {/* FILE/FILES PREVIEW */}
                    {isFileField ? (
                      <FilePreviewField
                        field={field}
                        value={value}
                        onChange={(newValue) => handleFieldChange(field.name, newValue)}
                        onDelete={(index) => handleFileDelete(field.name, index)}
                        multiple={field.type === "files"}
                        table={table}
                      />
                    ) : field.type === "bool" ? (
                      <div className="flex items-center gap-2">
                        <Switch
                          id={field.name}
                          checked={!!value}
                          onCheckedChange={(checked) => handleFieldChange(field.name, checked)}
                          disabled={isDisabled}
                        />
                        <span>{formData[field.name] ? "True" : "False"}</span>
                      </div>
                    ) : field.type === "date" || field.type === "datetime" || field.type === "timestamp" ? (
                      <Input
                        id={field.name}
                        type="datetime-local"
                        value={value ? formatDateForInput(value) : ""}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        disabled={isDisabled}
                        className={`w-full ${isDisabled ? "bg-muted" : ""}`}
                      />
                    ) : field.type.match(/^int|^uint|double|number$/) ? (
                      <Input
                        id={field.name}
                        type="number"
                        value={value ?? ""}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        disabled={isDisabled}
                        className={`w-full ${isDisabled ? "bg-muted" : ""}`}
                        placeholder={`Enter '${field.type}' value`}
                      />
                    ) : (
                      <Input
                        id={field.name}
                        type={field.name === "password" ? "password" : "text"}
                        value={value ?? ""}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        disabled={isDisabled}
                        className={`w-full ${isDisabled ? "bg-muted" : ""}`}
                        placeholder={`Enter '${field.type}' value`}
                      />
                    )}

                    {isDisabled && (
                      <p className="text-xs text-muted-foreground">System generated field - cannot be modified</p>
                    )}
                    {table.schema.type === "auth" && field.name === "password" && (
                      <p className="text-xs text-muted-foreground">Password fields are redacted in API responses.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>

        </div>

        <DrawerFooter>
          {/* Do not allow editing view types */}
          {isViewType && (
            <p className="text-xs text-muted-foreground">View tables cannot be modified from here!</p>
          )}

          {/* For non view types, allow making data changes */}
          {!isViewType && (
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isLoading || isViewType} className="flex-1">
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )
          }
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
