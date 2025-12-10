"use client"

import * as React from "react"
import { Download, Search, ChevronLeft, ChevronRight } from "lucide-react"

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

interface LogEntry {
  id: string
  timestamp: string
  level: "info" | "warning" | "error"
  message: string
  source: string
  details?: string
}

interface LogsSectionProps {
  apiClient: ApiClient
}

const ITEMS_PER_PAGE = 10

export function LogsSection({ apiClient }: LogsSectionProps) {
  // Mock data - sorted by latest first
  const [allLogs] = React.useState<LogEntry[]>([
    {
      id: "1",
      timestamp: "2024-01-15T10:30:00Z",
      level: "info",
      message: "User login successful",
      source: "auth",
      details: "User admin@example.com logged in from IP 192.168.1.1",
    },
    {
      id: "2",
      timestamp: "2024-01-15T10:25:00Z",
      level: "warning",
      message: "Rate limit approaching",
      source: "api",
      details: "API rate limit at 80% for endpoint /api/v1/tables",
    },
    {
      id: "3",
      timestamp: "2024-01-15T10:20:00Z",
      level: "error",
      message: "Database connection failed",
      source: "database",
      details: "Connection timeout after 30 seconds",
    },
    {
      id: "4",
      timestamp: "2024-01-15T10:15:00Z",
      level: "info",
      message: "Table created successfully",
      source: "database",
      details: "New table 'products' created with 5 columns",
    },
    {
      id: "5",
      timestamp: "2024-01-15T10:10:00Z",
      level: "info",
      message: "Backup completed",
      source: "system",
      details: "Daily backup completed successfully (2.3GB)",
    },
    {
      id: "6",
      timestamp: "2024-01-15T10:05:00Z",
      level: "info",
      message: "Cache cleared",
      source: "system",
      details: "Application cache cleared successfully",
    },
    {
      id: "7",
      timestamp: "2024-01-15T10:00:00Z",
      level: "warning",
      message: "High memory usage detected",
      source: "system",
      details: "Memory usage at 85% of available capacity",
    },
    {
      id: "8",
      timestamp: "2024-01-15T09:55:00Z",
      level: "info",
      message: "Scheduled task completed",
      source: "system",
      details: "Daily maintenance task completed in 2.3 seconds",
    },
    {
      id: "9",
      timestamp: "2024-01-15T09:50:00Z",
      level: "error",
      message: "Failed to send email notification",
      source: "email",
      details: "SMTP server connection timeout",
    },
    {
      id: "10",
      timestamp: "2024-01-15T09:45:00Z",
      level: "info",
      message: "API request processed",
      source: "api",
      details: "GET /api/v1/users processed in 45ms",
    },
    {
      id: "11",
      timestamp: "2024-01-15T09:40:00Z",
      level: "info",
      message: "User session expired",
      source: "auth",
      details: "Session expired for user user@example.com",
    },
    {
      id: "12",
      timestamp: "2024-01-15T09:35:00Z",
      level: "warning",
      message: "Slow query detected",
      source: "database",
      details: "Query took 2.5 seconds to execute",
    },
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()))

  const [searchTerm, setSearchTerm] = React.useState("")
  const [levelFilter, setLevelFilter] = React.useState<string>("all")
  const [currentPage, setCurrentPage] = React.useState(1)

  const filteredLogs = React.useMemo(() => {
    return allLogs.filter((log) => {
      const matchesSearch =
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesLevel = levelFilter === "all" || log.level === levelFilter
      return matchesSearch && matchesLevel
    })
  }, [allLogs, searchTerm, levelFilter])

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex)

  React.useEffect(() => {
    // Reset to first page when filters change
    setCurrentPage(1)
  }, [searchTerm, levelFilter])

  const getLevelColor = (level: string) => {
    switch (level) {
      case "error":
        return "destructive"
      case "warning":
        return "secondary"
      case "info":
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

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Logs</h1>
          <p className="text-muted-foreground">Monitor system activity and events</p>
        </div>
        <Button>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
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
                className="pl-9"
              />
            </div>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
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
                Showing {startIndex + 1}-{Math.min(endIndex, filteredLogs.length)} of {filteredLogs.length} entries
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead className="w-[100px]">Level</TableHead>
                  <TableHead className="w-[120px]">Source</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead className="max-w-md">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLogs.map((log) => (
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
                        <span className="font-medium capitalize">{log.source}</span>
                      </TableCell>
                      <TableCell className="font-medium">{log.message}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="max-w-md truncate" title={log.details}>
                          {log.details || "-"}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
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
                  })}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
