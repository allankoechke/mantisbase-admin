"use client"

import * as React from "react"
import { Search, Table, RefreshCw, Plus, ExternalLink, FileText, Database, MoreHorizontal, Copy, Pencil, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { ApiClient, TableMetadata } from "@/lib/api"
import { AddTableDialog } from "./add-table-dialog"
import { TableDetailView } from "./table-detail-view"
import { TableDocsDrawer } from "./table-docs-drawer"
import { useRouter } from "@/lib/router"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface DatabaseSectionProps {
  apiClient: ApiClient
  tables: TableMetadata[]
  onTablesUpdate: (tables: TableMetadata[]) => void
}

export function DatabaseSection({ apiClient, tables, onTablesUpdate }: DatabaseSectionProps) {
  const { route, navigate } = useRouter()
  const { toast } = useToast()

  // Initialize search term from query params
  const initialFilter = route.queryParams.filter || ""
  const [searchTerm, setSearchTerm] = React.useState(initialFilter)
  const [editingTable, setEditingTable] = React.useState<TableMetadata | null>(null)
  const [searchExpanded, setSearchExpanded] = React.useState(false)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [docsOpen, setDocsOpen] = React.useState(false)

  // Clone: open create-entity drawer with schema pre-filled
  const [addDrawerOpen, setAddDrawerOpen] = React.useState(false)
  const [cloneSourceTable, setCloneSourceTable] = React.useState<TableMetadata | null>(null)

  // Rename entity dialog
  const [renameTable, setRenameTable] = React.useState<TableMetadata | null>(null)
  const [renameNewName, setRenameNewName] = React.useState("")
  const [isRenaming, setIsRenaming] = React.useState(false)

  // Delete entity confirmation
  const [deleteTable, setDeleteTable] = React.useState<TableMetadata | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Sync search term with query params
  React.useEffect(() => {
    const filterFromQuery = route.queryParams.filter || ""
    if (filterFromQuery !== searchTerm) {
      setSearchTerm(filterFromQuery)
    }
  }, [route.queryParams.filter])

  // Update URL when search term changes (debounced)
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (route.path === "/entities" || route.path === "/entities/:name") {
    const queryParams: Record<string, string> = searchTerm ? { filter: searchTerm } : {}
    if (route.pathParams.name) {
      navigate("/entities/:name", { name: route.pathParams.name }, queryParams)
    } else {
      navigate("/entities", undefined, queryParams)
    }
      }
    }, 300) // Debounce for 300ms

    return () => clearTimeout(timeoutId)
  }, [searchTerm, route.path, route.pathParams.name])

  // Get selected entity name from path params
  const selectedEntityName = route.pathParams.name || null

  const filteredTables = Array.isArray(tables) ? tables?.filter((table) => table?.schema?.name?.toLowerCase().includes(searchTerm.toLowerCase())) : []

  const handleDeleteTable = async (tableId: string) => {
    setIsDeleting(true)
    try {
      const res: any = await apiClient.call(`/api/v1/schemas/${tableId}`, { method: "DELETE" })
      if (res?.error?.length > 0) throw res.error

      const response: any = await apiClient.call("/api/v1/schemas")
      if (response?.error?.length > 0) throw response.error

      let updatedTables: TableMetadata[] = []
      if (Array.isArray(response)) {
        updatedTables = response
      } else if (response?.data && Array.isArray(response.data)) {
        updatedTables = response.data
      }
      onTablesUpdate(updatedTables)
      setDeleteTable(null)
      toast({
        title: "Entity deleted",
        description: "The entity has been deleted successfully.",
        duration: 3000,
      })
    } catch (error: unknown) {
      console.error("Failed to delete table:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete entity",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleRenameSubmit = async () => {
    if (!renameTable || !renameNewName.trim()) return
    const trimmed = renameNewName.trim()
    if (trimmed === renameTable.schema.name) {
      setRenameTable(null)
      setRenameNewName("")
      return
    }
    setIsRenaming(true)
    try {
      const res: any = await apiClient.call(`/api/v1/schemas/${renameTable.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: trimmed }),
      })
      if (res?.error?.length > 0) throw res.error

      const response: any = await apiClient.call("/api/v1/schemas")
      if (response?.error?.length > 0) throw response.error

      let updatedTables: TableMetadata[] = []
      if (Array.isArray(response)) {
        updatedTables = response
      } else if (response?.data && Array.isArray(response.data)) {
        updatedTables = response.data
      }
      onTablesUpdate(updatedTables)
      setRenameTable(null)
      setRenameNewName("")
      toast({
        title: "Entity renamed",
        description: `Renamed to "${trimmed}".`,
      })
    } catch (error: unknown) {
      console.error("Failed to rename entity:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to rename entity",
      })
    } finally {
      setIsRenaming(false)
    }
  }

  const handleEntityClick = (entityName: string) => {
    try {
      navigate("/entities/:name", { name: entityName })
    } catch (error) {
      console.warn("Failed to navigate to entity:", error)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const response: any = await apiClient.call("/api/v1/schemas")

      // If the request failed, throw the error here 
      if (response?.error?.length > 0) throw response.error

      // Handle different response structures
      let updatedTables: TableMetadata[] = []
      if (Array.isArray(response)) {
        updatedTables = response
      } else if (response?.data && Array.isArray(response.data)) {
        updatedTables = response.data
      }

      onTablesUpdate(updatedTables)
    } catch (error) {
      console.error("Failed to refresh tables:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const selectedEntity = selectedEntityName
    ? Array.isArray(tables) ? tables.find((t) => t.schema.name === selectedEntityName) : null
    : null

  return (
    <div className="flex h-[100vh] gap-4 pr-8">
      {/* Entity List Sidebar */}
      <div className="w-64 flex-shrink-0 border-r bg-muted/30">
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-4 border-b space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Database className="h-5 w-5" />
                Entities
              </h2>
              <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search entities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <div className="flex gap-2">
              <AddTableDialog apiClient={apiClient} onTablesUpdate={onTablesUpdate} tables={tables}>
                <Button size="sm" className="flex-1">
                  <Plus className="h-4 w-4 mr-2" />
                  New
                </Button>
              </AddTableDialog>
              <Button variant="outline" size="sm" onClick={() => setDocsOpen(true)}>
                <FileText className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Entity List */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {filteredTables.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {searchTerm ? "No entities found matching the search term" : "No entities, add some to get started"}
                </div>
              ) : (
                filteredTables.map((table) => (
                  <div
                    key={table.id}
                    className={cn(
                      "group flex items-center gap-1 rounded-lg transition-colors",
                      selectedEntityName === table.schema.name && "bg-accent text-accent-foreground"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => handleEntityClick(table.schema.name)}
                      className={cn(
                        "flex-1 text-left p-3 rounded-lg transition-colors hover:bg-accent min-w-0",
                        selectedEntityName === table.schema.name && "bg-accent text-accent-foreground"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Table className="h-4 w-4 flex-shrink-0" />
                          <span className="font-medium truncate">{table.schema.name}</span>
                        </div>
                        <Badge
                          variant={table.schema.type === "auth" ? "default" : table.schema.type === "view" ? "secondary" : "outline"}
                          className="text-xs flex-shrink-0 ml-2"
                        >
                          {table.schema.type}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {table.schema.fields?.length || 0} fields
                      </div>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Entity actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem
                          onClick={() => {
                            setCloneSourceTable(table)
                            setAddDrawerOpen(true)
                          }}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Clone
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setRenameTable(table)
                            setRenameNewName(table.schema.name)
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteTable(table)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto pt-4 pl-4">
        {selectedEntity ? (
          <TableDetailView
            table={selectedEntity}
            onBack={() => {
              try {
                navigate("/entities", undefined, undefined)
              } catch (error) {
                console.warn("Failed to navigate back:", error)
              }
            }}
            apiClient={apiClient}
            onTableUpdate={(updatedTable) => {
              const updatedTables = tables.map((t) => (t.id === updatedTable.id ? updatedTable : t))
              onTablesUpdate(updatedTables)
            }}
            onTablesUpdate={onTablesUpdate}
            tables={tables}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            {tables.length === 0 && !isRefreshing ? (
              <Card className="w-full max-w-md">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Table className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Entities Found</h3>
                  <p className="text-muted-foreground text-center mb-6">
                    Get started by creating your first entity. Entities are used to store and organize your data.
                  </p>
                  <div className="flex gap-3">
                    <AddTableDialog apiClient={apiClient} onTablesUpdate={onTablesUpdate} tables={tables}>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Entity
                      </Button>
                    </AddTableDialog>
                    <Button variant="outline" onClick={() => setDocsOpen(true)}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Documentation
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center space-y-4">
                <Database className="h-16 w-16 text-muted-foreground mx-auto" />
                <div>
                  <h2 className="text-2xl font-semibold mb-2">Select an Entity</h2>
                  <p className="text-muted-foreground">
                    Choose an entity from the sidebar to view and manage its data
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Entity Schema API Documentation */}
      <TableDocsDrawer open={docsOpen} onClose={() => setDocsOpen(false)} />

      {/* Clone entity: create drawer with schema pre-filled */}
      <AddTableDialog
        apiClient={apiClient}
        onTablesUpdate={onTablesUpdate}
        tables={tables}
        open={addDrawerOpen}
        onOpenChange={(open) => {
          setAddDrawerOpen(open)
          if (!open) setCloneSourceTable(null)
        }}
        sourceTable={cloneSourceTable}
      />

      {/* Rename entity dialog */}
      <Dialog open={!!renameTable} onOpenChange={(open) => { if (!open) { setRenameTable(null); setRenameNewName("") } }}>
        <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Rename entity</DialogTitle>
            <DialogDescription>
              Enter a new name for the entity. This does not affect existing data.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rename-entity-name">New name</Label>
              <Input
                id="rename-entity-name"
                value={renameNewName}
                onChange={(e) => setRenameNewName(e.target.value)}
                placeholder="Entity name"
                onKeyDown={(e) => e.key === "Enter" && handleRenameSubmit()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRenameTable(null); setRenameNewName("") }}>
              Cancel
            </Button>
            <Button onClick={handleRenameSubmit} disabled={!renameNewName.trim() || isRenaming}>
              {isRenaming ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete entity confirmation */}
      <AlertDialog open={!!deleteTable} onOpenChange={(open) => { if (!open) setDeleteTable(null) }}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete entity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the entity <strong>"{deleteTable?.schema.name}"</strong>? This action cannot be undone and will permanently delete all data associated with this entity.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTable && handleDeleteTable(deleteTable.id)}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
