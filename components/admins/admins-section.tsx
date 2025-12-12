"use client"

import * as React from "react"
import { MoreHorizontal, Key, Trash2, Plus, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog } from "@/components/ui/dialog"
import type { ApiClient, Admin, TableMetadata } from "@/lib/api"
import { ChangePasswordDialog } from "./change-password-dialog"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { AddItemDrawer } from "../database/add-item-drawer"
import { useToast } from "@/hooks/use-toast"

interface AdminsSectionProps {
  admins: Admin[]
  apiClient: ApiClient
  onAdminsUpdate: (admins: Admin[]) => void
}

export function AdminsSection({ admins, apiClient, onAdminsUpdate }: AdminsSectionProps) {
  const [selectedAdmin, setSelectedAdmin] = React.useState<Admin | null>(null)
  const [addingAdmin, setAddingAdmin] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const { toast } = useToast()

  const table: any = {
    has_api: true,
    name: "mb_admins",
    system: true,
    type: "auth",
    schema: {
      fields: [
        {
          autoGeneratePattern: null,
          defaultValue: null,
          maxValue: null,
          minValue: null,
          name: "id",
          primaryKey: true,
          required: true,
          system: true,
          type: "string",
          unique: false,
          validator: null
        },
        {
          autoGeneratePattern: null,
          defaultValue: null,
          maxValue: null,
          minValue: 5.0,
          name: "email",
          primaryKey: false,
          required: true,
          system: true,
          type: "string",
          unique: true,
          validator: "email"
        },
        {
          autoGeneratePattern: null,
          defaultValue: null,
          maxValue: null,
          minValue: 8.0,
          name: "password",
          primaryKey: false,
          required: true,
          system: true,
          type: "string",
          unique: false,
          validator: "password"
        },
        {
          autoGeneratePattern: null,
          defaultValue: null,
          maxValue: null,
          minValue: null,
          name: "created",
          primaryKey: false,
          required: true,
          system: true,
          type: "date",
          unique: false,
          validator: null
        },
        {
          autoGeneratePattern: null,
          defaultValue: null,
          maxValue: null,
          minValue: null,
          name: "updated",
          primaryKey: false,
          required: true,
          system: true,
          type: "date",
          unique: false,
          validator: null
        }
      ],
    }
  };

  const handleDeleteAdmin = async (adminId: string) => {
    try {
      const res: any = await apiClient.call(`/api/v1/entities/mb_admins/${adminId}`, { method: "DELETE" })

      // If the request failed, throw the error here 
      if (res?.error?.length > 0) throw res.error

      const response: any = await apiClient.call("/api/v1/entities/mb_admins")

      // If the request failed, throw the error here 
      if (response?.error?.length > 0) throw response.error

      // Handle paginated response structure: { items: [...], items_count, page, page_size, total_count }
      let updatedAdmins: Admin[] = []
      if (Array.isArray(response)) {
        // Fallback: if response is directly an array (shouldn't happen with new API)
        updatedAdmins = response
      } else if (response?.items && Array.isArray(response.items)) {
        // Paginated response: extract items from data object
        updatedAdmins = response.items
      } else if (response?.data?.items && Array.isArray(response.data.items)) {
        // If data is nested
        updatedAdmins = response.data.items
      }

      onAdminsUpdate(updatedAdmins)

      toast({
        title: "Admin Deleted",
        description: "Admin account deleted successfully!",
        duration: 3000,
      })
    } catch (error) {
      console.error("Failed to delete admin:", error)
    }
  }

  const handleAdminAdded = (admin: Admin) => {
    console.log("Admin to be added:", admin)
    onAdminsUpdate([...admins, admin])

    toast({
      title: "Admin User Added",
      description: "Admin account added successfully!",
    })

    setAddingAdmin(false)
  }

  const handleReload = async () => {
    try {
      setIsLoading(true)
      const response: any = await apiClient.call("/api/v1/entities/mb_admins")
      
      // Handle paginated response structure: { items: [...], items_count, page, page_size, total_count }
      let updatedAdmins: Admin[] = []
      if (Array.isArray(response)) {
        // Fallback: if response is directly an array (shouldn't happen with new API)
        updatedAdmins = response
      } else if (response?.items && Array.isArray(response.items)) {
        // Paginated response: extract items from data object
        updatedAdmins = response.items
      } else if (response?.data?.items && Array.isArray(response.data.items)) {
        // If data is nested
        updatedAdmins = response.data.items
      }
      
      onAdminsUpdate(updatedAdmins)
    } catch (error) {
      console.error("Failed to reload admins:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Admins</h1>
          <p className="text-muted-foreground">Manage administrator accounts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReload} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>

          <Button size="sm" onClick={() => setAddingAdmin(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Record
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Administrator Accounts</CardTitle>
          <CardDescription>{admins.length} administrator accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.isArray(admins) && admins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell className="font-medium">{admin.email}</TableCell>
                  <TableCell>{new Date(admin.created).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(admin.updated).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedAdmin(admin)}>
                          <Key className="h-4 w-4 mr-2" />
                          Change Password
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteAdmin(admin.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove Admin
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedAdmin} onOpenChange={() => setSelectedAdmin(null)}>
        {selectedAdmin && (
          <ChangePasswordDialog admin={selectedAdmin} apiClient={apiClient} onClose={() => setSelectedAdmin(null)} />
        )}
      </Dialog>

      {addingAdmin && (
        <AddItemDrawer
          table={table}
          apiClient={apiClient}
          open={!!addingAdmin}
          onClose={() => setAddingAdmin(false)}
          onItemAdded={handleAdminAdded}
        />
      )}
    </div>
  )
}
