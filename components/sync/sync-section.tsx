"use client"

import * as React from "react"
import { RefreshCw, Clock, CheckCircle, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function SyncSection() {
  const [isLoading, setIsLoading] = React.useState(false)

  const handleSync = async () => {
    setIsLoading(true)
    // Simulate sync operation
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsLoading(false)
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Sync</h1>
          <p className="text-muted-foreground">Manage data sync operations and status</p>
        </div>
        <Button onClick={handleSync} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? "Syncing..." : "Sync Now"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2 hours ago</div>
            <p className="text-xs text-muted-foreground">Jan 15, 2024 at 10:30 AM</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sync Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Healthy</div>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Items</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Items waiting to sync</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sync Configuration</CardTitle>
          <CardDescription>Configure automatic synchronization settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Auto Sync</h4>
                <p className="text-sm text-muted-foreground">Automatically sync data every hour</p>
              </div>
              <Badge variant="secondary">Enabled</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Conflict Resolution</h4>
                <p className="text-sm text-muted-foreground">How to handle data conflicts</p>
              </div>
              <Badge variant="outline">Server Wins</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Backup Before Sync</h4>
                <p className="text-sm text-muted-foreground">Create backup before each sync</p>
              </div>
              <Badge variant="secondary">Enabled</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
