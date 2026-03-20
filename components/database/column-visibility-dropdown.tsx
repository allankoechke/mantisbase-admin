"use client"
import { Eye, EyeOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { TableMetadata } from "@/lib/api"

interface ColumnVisibilityDropdownProps {
  table: TableMetadata
  visibleColumns: string[]
  onVisibilityChange: (columns: string[]) => void
}

export function ColumnVisibilityDropdown({ table, visibleColumns, onVisibilityChange }: ColumnVisibilityDropdownProps) {
  const toggleColumn = (columnName: string) => {
    if (visibleColumns.includes(columnName)) {
      onVisibilityChange(visibleColumns.filter((col) => col !== columnName))
    } else {
      onVisibilityChange([...visibleColumns, columnName])
    }
  }

  const showAll = () => {
    onVisibilityChange(table.schema.fields?.map((field) => field.name) || [])
  }

  const hideAll = () => {
    // Keep at least the ID column visible
    onVisibilityChange(["id"])
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4 mr-2" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Column Visibility</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between px-2 py-1">
          <Button variant="ghost" size="sm" onClick={showAll} className="h-auto p-1 text-xs">
            <Eye className="h-3 w-3 mr-1" />
            Show All
          </Button>
          <Button variant="ghost" size="sm" onClick={hideAll} className="h-auto p-1 text-xs">
            <EyeOff className="h-3 w-3 mr-1" />
            Hide All
          </Button>
        </div>
        <DropdownMenuSeparator />
        {table.schema.fields?.map((field) => (
          <DropdownMenuCheckboxItem
            key={field.name}
            checked={visibleColumns.includes(field.name)}
            onCheckedChange={() => toggleColumn(field.name)}
            disabled={field.name === "id"} // Always keep ID visible
          >
            <span>{field.name}</span>
            {field.name === "id" && <span className="text-xs text-muted-foreground ml-2">(required)</span>}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
