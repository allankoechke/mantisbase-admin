"use client"

import * as React from "react"
import { Search, Table, RefreshCw, Plus, ExternalLink, FileText, Database } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { ApiClient, TableMetadata } from "@/lib/api"
import { AddTableDialog } from "./add-table-dialog"
import { TableDetailView } from "./table-detail-view"
import { SidebarTrigger } from "@/components/ui/sidebar"
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
        const queryParams = searchTerm ? { filter: searchTerm } : {}
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

  const filteredTables = Array.isArray(tables) ? tables?.filter((table) => table.name.toLowerCase().includes(searchTerm.toLowerCase())) : []

  const handleDeleteTable = async (tableId: string) => {
    try {
      const res: any = await apiClient.call(`/api/v1/tables/${tableId}`, { method: "DELETE" })

      // If the request failed, throw the error here 
      if (res?.error?.length > 0) throw res.error

      // Fetch new tables
      const updatedTables = await apiClient.call<TableMetadata[]>("/api/v1/tables")

      // If the request failed, throw the error here 
      if (updatedTables?.error?.length > 0) throw updatedTables.error

      // Set the new tables
      onTablesUpdate(updatedTables)

      toast({
        title: "Table Deleted",
        description: "Table deleted successfully!",
        duration: 3000,
      })
    } catch (error) {
      console.error("Failed to delete table:", error)
      // toast({
      //   title: "Error Deleted",
      //   description: "Table deleted successfully!",
      //   duration: 3000,
      // })
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
      const updatedTables = await apiClient.call<TableMetadata[]>("/api/v1/tables")

      // If the request failed, throw the error here 
      if (updatedTables?.error?.length > 0) throw updatedTables.error

      onTablesUpdate(updatedTables)
    } catch (error) {
      console.error("Failed to refresh tables:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const selectedEntity = selectedEntityName
    ? Array.isArray(tables) ? tables.find((t) => t.name === selectedEntityName) : null
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
              <AddTableDialog apiClient={apiClient} onTablesUpdate={onTablesUpdate}>
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
                  {searchTerm ? "No entities found" : "No entities"}
                </div>
              ) : (
                filteredTables.map((table) => (
                  <button
                    key={table.id}
                    onClick={() => handleEntityClick(table.name)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg transition-colors hover:bg-accent",
                      selectedEntityName === table.name && "bg-accent text-accent-foreground"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Table className="h-4 w-4 flex-shrink-0" />
                        <span className="font-medium truncate">{table.name}</span>
                      </div>
                      <Badge
                        variant={table.type === "auth" ? "default" : table.type === "view" ? "secondary" : "outline"}
                        className="text-xs flex-shrink-0 ml-2"
                      >
                        {table.type}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {table.schema.fields?.length || 0} fields
                    </div>
                  </button>
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
                    <AddTableDialog apiClient={apiClient} onTablesUpdate={onTablesUpdate}>
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

      {/* Open docs on table CRUD */}
      <TableDocsDrawer open={docsOpen} onClose={() => setDocsOpen(false)} />
    </div>
  )
}
