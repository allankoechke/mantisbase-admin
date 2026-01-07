"use client"

import * as React from "react"
import { Download, Search, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import type { ApiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface LogEntry {
  id: string
  timestamp: string
  created_at: number
  level: "critical" | "warn" | "info" | "debug" | "trace"
  message: string
  origin: string
  details?: string
  data?: any // Optional JSON value (object/array/value/etc.)
}

interface PaginatedLogsResponse {
  items: LogEntry[]
  items_count: number
  page: number
  page_size: number
  total_count: number
}

interface LogsSectionProps {
  apiClient: ApiClient
}

const ITEMS_PER_PAGE = 10

export function LogsSection({ apiClient }: LogsSectionProps) {
  const [logs, setLogs] = React.useState<LogEntry[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [totalCount, setTotalCount] = React.useState<number>(-1) // -1 means unknown
  const [searchTerm, setSearchTerm] = React.useState("")
  const [levelFilter, setLevelFilter] = React.useState<string>("all")
  const { toast } = useToast()

  const loadLogs = React.useCallback(async (page: number = 1) => {
    setIsLoading(true)
    try {
      // Build query parameters
      const params = new URLSearchParams()
      params.append("page", page.toString())
      params.append("page_size", ITEMS_PER_PAGE.toString())
      
      // Add level filter if not "all"
      if (levelFilter !== "all") {
        params.append("level", levelFilter)
      }
      
      // Add search term if provided
      if (searchTerm.trim()) {
        params.append("search", searchTerm.trim())
      }

      const response = await apiClient.call<PaginatedLogsResponse>(`/api/v1/sys/logs?${params.toString()}`)

      // Handle different response structures
      let logsData: LogEntry[] = []
      let count = -1

      if (Array.isArray(response)) {
        // Fallback: if response is directly an array
        logsData = response
      } else if (response?.items && Array.isArray(response.items)) {
        // Paginated response
        logsData = response.items
        count = response.total_count ?? -1
      } else if ((response as any)?.data?.items && Array.isArray((response as any).data.items)) {
        // If data is nested (handle as any for nested structure)
        logsData = (response as any).data.items
        count = (response as any).data.total_count ?? -1
      } else {
        console.warn("Unexpected response format:", response)
        logsData = []
      }

      setLogs(logsData)
      setTotalCount(count)
    } catch (error: any) {
      console.error("Failed to load logs:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || "Failed to load logs",
      })
      setLogs([])
      setTotalCount(-1)
    } finally {
      setIsLoading(false)
    }
  }, [apiClient, levelFilter, searchTerm, toast])

  // Load logs when component mounts or filters change
  React.useEffect(() => {
    loadLogs(currentPage)
  }, [currentPage, levelFilter, searchTerm])

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, levelFilter])

  const getLevelColor = (level: string) => {
    switch (level) {
      case "critical":
        return "destructive"
      case "warn":
        return "secondary"
      case "info":
        return "outline"
      case "debug":
        return "outline"
      case "trace":
        return "outline"
      default:
        return "outline"
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const formatData = (data: any): string => {
    if (data === null || data === undefined) {
      return ""
    }
    try {
      return JSON.stringify(data, null, 2)
    } catch {
      return String(data)
    }
  }

  // Calculate total pages (show -- if total_count is -1)
  const totalPages = totalCount === -1 ? null : Math.ceil(totalCount / ITEMS_PER_PAGE)
  const hasMorePages = totalCount === -1 || (totalPages !== null && currentPage < totalPages)

  const handleSearch = () => {
    setCurrentPage(1)
    loadLogs(1)
  }

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const handleReload = () => {
    loadLogs(currentPage)
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Logs</h1>
          <p className="text-muted-foreground">Monitor system activity and events</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleReload} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" disabled>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                className="pl-9"
              />
            </div>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="warn">Warn</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
                <SelectItem value="trace">Trace</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch} variant="outline">
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>System Logs</CardTitle>
              <CardDescription>
                {isLoading ? (
                  "Loading logs..."
                ) : totalCount === -1 ? (
                  `Showing page ${currentPage} (-- total entries)`
                ) : (
                  `Showing ${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of ${totalCount} entries`
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && logs.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading logs...</p>
              </div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Timestamp</TableHead>
                    <TableHead className="w-[100px]">Level</TableHead>
                    <TableHead className="w-[120px]">Origin</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="max-w-md">Details</TableHead>
                    <TableHead className="max-w-md">Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No logs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-xs">
                          {formatTimestamp(log.timestamp)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getLevelColor(log.level) as any} className="font-medium">
                            {log.level.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{log.origin}</span>
                        </TableCell>
                        <TableCell className="font-medium">{log.message}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <div className="max-w-md truncate" title={log.details}>
                            {log.details || "-"}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground font-mono">
                          {log.data !== undefined && log.data !== null ? (
                            <div className="max-w-md truncate" title={formatData(log.data)}>
                              {formatData(log.data)}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {(totalPages !== null && totalPages > 1) || hasMorePages ? (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} {totalPages !== null ? `of ${totalPages}` : "(--)"}
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => {
                        if (currentPage > 1) {
                          setCurrentPage((prev) => prev - 1)
                        }
                      }}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  {totalPages !== null ? (
                    // Show page numbers when we know the total
                    Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Show first page, last page, current page, and pages around current
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return (
                          <PaginationItem key={page}>
                            <span className="px-2">...</span>
                          </PaginationItem>
                        )
                      }
                      return null
                    })
                  ) : (
                    // Show current page only when total is unknown
                    <PaginationItem>
                      <PaginationLink isActive className="cursor-default">
                        {currentPage}
                      </PaginationLink>
                    </PaginationItem>
                  )}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => {
                        if (totalPages === null || currentPage < totalPages) {
                          setCurrentPage((prev) => prev + 1)
                        }
                      }}
                      className={
                        totalPages !== null && currentPage >= totalPages
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
