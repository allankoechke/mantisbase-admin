"use client"

import * as React from "react"
import { RefreshCw, Cog, FileText, Trash2, Search, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { ApiClient, TableMetadata, getApiBaseUrl } from "@/lib/api"
import { TableConfigDrawer } from "./table-config-drawer"
import { TableRecordDocsDrawer } from "./table-records-docs-drawer"
import { EditItemDrawer } from "./edit-item-drawer"
import { AddItemDrawer } from "./add-item-drawer"
import { ColumnVisibilityDropdown } from "./column-visibility-dropdown"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "@/lib/router"

interface TableDetailViewProps {
  table: TableMetadata
  onBack?: () => void
  apiClient: ApiClient
  onTableUpdate: (table: TableMetadata) => void
}

export function TableDetailView({ table, onBack, apiClient, onTableUpdate }: TableDetailViewProps) {
  const [tableData, setTableData] = React.useState<any[]>([])
  const [currentPage, setCurrentPage] = React.useState(1)
  const [totalPages, setTotalPages] = React.useState(1)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isViewType, setIsViewType] = React.useState(false)
  const [configOpen, setConfigOpen] = React.useState(false)
  const [docsOpen, setDocsOpen] = React.useState(false)
  const [addingItem, setAddingItem] = React.useState<any>(false)
  const [editingItem, setEditingItem] = React.useState<any>(null)
  const [selectedItems, setSelectedItems] = React.useState<string[]>([])
  const [visibleColumns, setVisibleColumns] = React.useState<string[]>(
    table.schema.fields?.map((field) => field.name) || [],
  )
  const [isDeleting, setIsDeleting] = React.useState(false)
  const { route, navigate } = useRouter()
  const { toast } = useToast()
  
  // Initialize filter from query params
  const initialFilter = route.queryParams.filter || ""
  const [filterTerm, setFilterTerm] = React.useState(initialFilter)
  const [appliedFilter, setAppliedFilter] = React.useState(initialFilter)

  // Sync filter with query params
  React.useEffect(() => {
    const filterFromQuery = route.queryParams.filter || ""
    if (filterFromQuery !== appliedFilter) {
      setAppliedFilter(filterFromQuery)
      setFilterTerm(filterFromQuery)
    }
  }, [route.queryParams.filter])

  React.useEffect(() => {
    loadTableData()
  }, [currentPage, appliedFilter])

  React.useEffect(() => {
    setIsViewType(table.type === "view")
  }, [table.type])

  React.useEffect(() => {
    setVisibleColumns(table.schema.fields?.map((field) => field.name) || [])
  }, [table.schema.fields])

  const loadTableData = async () => {
    setIsLoading(true)

    try {
      const response = await apiClient.call<any>(`/api/v1/entities/${table.name}`)

      // If the request failed, throw the error here 
      if (response?.error?.length > 0) throw response.error

      // Handle paginated response structure: { items: [...], items_count, page, page_size, total_count }
      let tableData: any[] = []
      if (Array.isArray(response)) {
        // Fallback: if response is directly an array (shouldn't happen with new API)
        tableData = response
      } else if (response?.items && Array.isArray(response.items)) {
        // Paginated response: extract items from data object
        tableData = response.items
      } else if (response?.data?.items && Array.isArray(response.data.items)) {
        // If data is nested
        tableData = response.data.items
      } else {
        console.warn("Unexpected response format:", response)
        tableData = []
      }

      setTableData(tableData)

      // setTotalPages(3) // Mock pagination
      setSelectedItems([]) // Clear selection on reload
    } catch (error) {
      console.error("Failed to load table data:", error)
      setTableData([]) // Set empty array on error
    } finally {
      setIsLoading(false)
    }
  }

  const handleReload = () => {
    loadTableData()
  }

  const handleAddItem = () => {
    if (isViewType) return
    setAddingItem(true)
  }

  const handleFilter = () => {
    setAppliedFilter(filterTerm)
    setCurrentPage(1) // Reset to first page when filtering
    
    // Update URL with filter query param
    const queryParams = filterTerm ? { filter: filterTerm } : {}
    navigate("/entities/:name", { name: table.name }, queryParams)
  }

  const handleFilterKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleFilter()
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(tableData.map((item) => item.id))
    } else {
      setSelectedItems([])
    }
  }

  const handleSelectItem = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, itemId])
    } else {
      setSelectedItems(selectedItems.filter((id) => id !== itemId))
    }
  }

  const handleRowClick = (item: any, event: React.MouseEvent) => {
    // Don't open edit drawer if clicking on checkbox
    if ((event.target as HTMLElement).closest('input[type="checkbox"]')) {
      return
    }
    setEditingItem(item)
  }

  const handleItemUpdate = (updatedItem: any) => {
    setTableData((prevData) => prevData.map((item) => (item.id === updatedItem.id ? updatedItem : item)))
  }

  const handleItemAdded = (addedItem: any) => {
    setTableData([...tableData, addedItem])
  }

  const handleDeleteSelected = async () => {
    setIsDeleting(true)
    try {
      // Delete each selected item individually
      const deletePromises = selectedItems.map((itemId) =>
        apiClient.call(`/api/v1/entities/${table.name}/${itemId}`, { method: "DELETE" }),
      )

      await Promise.all(deletePromises)

      // Remove deleted items from table data
      setTableData((prevData) => prevData.filter((item) => !selectedItems.includes(item.id)))
      setSelectedItems([])
    } catch (error) {
      console.error("Failed to delete items:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredFields = table.schema.fields?.filter((field) => visibleColumns.includes(field.name)) || []

  function renderCellContent(field: { name: string; type: string }, value: any) {
    if (value === null) return "N/A";

    switch (field.type) {
      case "bool":
      case "boolean":
        return value ? "true" : "false";

      case "json":
        try {
          return (
            <pre className="max-w-[300px] whitespace-pre-wrap text-xs bg-muted p-1 rounded">
              {JSON.stringify(value, null, 2)}
            </pre>
          );
        } catch {
          return String(value);
        }

      case "file":
      case "files": {
        if(value==="" || value.length === 0) return "N/A";

        const filenames = Array.isArray(value) ? value : [value];
        return (
          <div className="flex gap-2 flex-wrap">
            {filenames.map((filename: string, i: number) => {
              const url = `${getApiBaseUrl()}/api/files/${table.name}/${encodeURIComponent(filename)}`;
              const ext = filename.split(".").pop()?.toLowerCase() || "";

              const isImage = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext);

              return isImage ? (
                <img
                  key={i}
                  src={url}
                  alt={filename}
                  className="h-10 w-10 object-cover rounded border"
                />
              ) : (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs underline text-blue-600"
                >
                  {filename}
                </a>
              );
            })}
          </div>
        );
      }

      default:
        return value ? String(value) : "N/A";
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            Entity <span className="text-primary font-mono italic">'{table.name}'</span> data
          </h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handleReload} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setConfigOpen(true)}>
            <Cog className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setDocsOpen(true)}>
            <FileText className="h-4 w-4" />
          </Button>
          {!isViewType && (
            <Button size="sm" onClick={handleAddItem} disabled={isLoading}>
              <Plus className="h-4 w-4 mr-2" />
              New Record
            </Button>
          )}
        </div>
      </div>

      {/* Search/Filter Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
        <Input
          placeholder="Search records..."
          value={filterTerm}
          onChange={(e) => setFilterTerm(e.target.value)}
          onKeyPress={handleFilterKeyPress}
          className="pl-10 pr-20"
        />
        <Button 
          onClick={handleFilter} 
          disabled={isLoading}
          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7"
          size="sm"
        >
          Filter
        </Button>
        {appliedFilter && (
          <div className="flex items-center gap-2 mt-2">
            <p className="text-sm text-muted-foreground">Filtering by: "{appliedFilter}"</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterTerm("")
                setAppliedFilter("")
                navigate("/entities/:name", { name: table.name }, {})
              }}
              className="h-6 text-xs"
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Table Data</CardTitle>
              <CardDescription>Current records in the {table.name} table</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {selectedItems.length > 0 && (
                <Button variant="destructive" size="sm" onClick={handleDeleteSelected} disabled={isDeleting}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeleting
                    ? "Deleting..."
                    : `Delete ${selectedItems.length} item${selectedItems.length > 1 ? "s" : ""}`}
                </Button>
              )}
              <ColumnVisibilityDropdown
                table={table}
                visibleColumns={visibleColumns}
                onVisibilityChange={setVisibleColumns}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedItems.length === tableData.length && tableData.length > 0}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  {filteredFields.map((field) => (
                    <TableHead key={field.name} className="capitalize">
                      {field.name}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={filteredFields.length + 1} className="text-center text-muted-foreground h-64">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : tableData.length > 0 ? (
                  tableData.map((row, index) => (
                    <TableRow
                      key={index}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={(e) => handleRowClick(row, e)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedItems.includes(row.id)}
                          onCheckedChange={(checked) => handleSelectItem(row.id, checked as boolean)}
                          aria-label={`Select row ${index + 1}`}
                        />
                      </TableCell>
                      {filteredFields.map((field) => (
                        <TableCell key={field.name}>
                          {renderCellContent(field, row[field.name])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={filteredFields.length + 1} className="text-center h-64 align-middle">
                      <div className="flex flex-col items-center justify-center py-16">
                        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Records Found</h3>
                        <p className="text-muted-foreground text-center mb-6 max-w-md">
                          This table doesn't have any records yet. Add some data to get started.
                        </p>
                        <div className="flex gap-3">
                          {!isViewType && (
                            <Button onClick={handleAddItem} disabled={isDeleting || isLoading}>
                              <Plus className="h-4 w-4 mr-2" />
                              New Record
                            </Button>
                          )}
                          <Button variant="outline" onClick={() => setDocsOpen(true)} disabled={isDeleting}>
                            <FileText className="h-4 w-4 mr-2" />
                            View API Documentation
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <TableConfigDrawer
        table={table}
        apiClient={apiClient}
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        onTableUpdate={onTableUpdate}
      />

      <TableRecordDocsDrawer table={table} open={docsOpen} onClose={() => setDocsOpen(false)} />

      {addingItem && (
        <AddItemDrawer
          table={table}
          apiClient={apiClient}
          open={!!addingItem}
          onClose={() => setAddingItem(null)}
          onItemAdded={handleItemAdded}
        />
      )}

      {editingItem && (
        <EditItemDrawer
          table={table}
          item={editingItem}
          apiClient={apiClient}
          open={!!editingItem}
          onClose={() => setEditingItem(null)}
          onItemUpdate={handleItemUpdate}
        />
      )}
    </div>
  )
}
