"use client"

import * as React from "react"
import { Key, MoreHorizontal, Plus, RefreshCw, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SYS_ADMINS_API, extractListItems, getApiClientError, type ApiClient, type Admin } from "@/lib/api"
import { ChangePasswordDialog } from "./change-password-dialog"
import { AddItemDrawer } from "../database/add-item-drawer"
import { ApiKeysPanel, openCreateApiKeyDialog } from "./api-keys-panel"
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
  const [activeTab, setActiveTab] = React.useState("accounts")
  const [createApiKeyForAdminId, setCreateApiKeyForAdminId] = React.useState<string | undefined>()
  const [createApiKeyRequested, setCreateApiKeyRequested] = React.useState(false)
  const [apiKeysReloadRequested, setApiKeysReloadRequested] = React.useState(0)
  const [apiKeysLoading, setApiKeysLoading] = React.useState(false)
  const { toast } = useToast()

  const table: any = {
    has_api: true,
    name: "mb_admins",
    system: true,
    type: "auth",
    schema: {
      id: "mbt_10394585042835534856",
      name: "mb_admins",
      has_api: true,
      system: true,
      type: "auth",
      fields: [
        {
          id: "mbf_14258576900392064537",
          name: "id",
          primary_key: true,
          required: true,
          system: true,
          type: "string",
          unique: false,
          constraints: {
            default_value: null,
            max_value: null,
            min_value: null,
            validator: "@password",
          },
        },
        {
          id: "mbf_13735287961322938256",
          name: "created",
          primary_key: false,
          required: true,
          system: true,
          type: "date",
          unique: false,
          constraints: {
            default_value: null,
            max_value: null,
            min_value: null,
            validator: null,
          },
        },
        {
          id: "mbf_9124719522053273721",
          name: "updated",
          primary_key: false,
          required: true,
          system: true,
          type: "date",
          unique: false,
          constraints: {
            default_value: null,
            max_value: null,
            min_value: null,
            validator: null,
          },
        },
        {
          id: "mbf_16339674465020246541",
          name: "email",
          primary_key: false,
          required: true,
          system: true,
          type: "string",
          unique: true,
          constraints: {
            default_value: null,
            max_value: null,
            min_value: null,
            validator: "@email",
          },
        },
        {
          id: "mbf_6072375419398818283",
          name: "password",
          primary_key: false,
          required: true,
          system: true,
          type: "string",
          unique: false,
          constraints: {
            default_value: null,
            max_value: null,
            min_value: null,
            validator: "@password",
          },
        },
      ],
      rules: {
        add: { expr: "", mode: "auth" },
        delete: { expr: "", mode: "auth" },
        get: { expr: "", mode: "auth" },
        list: { expr: "", mode: "auth" },
        update: { expr: "", mode: "auth" },
      },
    },
  }

  const handleDeleteAdmin = async (adminId: string) => {
    try {
      await apiClient.call(`${SYS_ADMINS_API}/${adminId}`, { method: "DELETE" })
      const response = await apiClient.call<unknown>(SYS_ADMINS_API)
      onAdminsUpdate(extractListItems<Admin>(response))

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
      const response = await apiClient.call<unknown>(SYS_ADMINS_API)
      const error = getApiClientError(response)
      if (error) {
        throw new Error(error)
      }
      onAdminsUpdate(extractListItems<Admin>(response))
    } catch (error) {
      console.error("Failed to reload admins:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reload admin accounts.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateApiKeyForAdmin = (adminId: string) => {
    openCreateApiKeyDialog(setCreateApiKeyForAdminId, setCreateApiKeyRequested, adminId)
    setActiveTab("api-keys")
  }

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Admins</h1>
        <p className="text-muted-foreground">Manage administrator accounts and API keys</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            {activeTab === "accounts" ? (
              <>
                <Button variant="outline" size="sm" onClick={handleReload} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                </Button>
                <Button size="sm" onClick={() => setAddingAdmin(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Record
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setApiKeysReloadRequested((count) => count + 1)}
                  disabled={apiKeysLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${apiKeysLoading ? "animate-spin" : ""}`} />
                </Button>
                <Button
                  size="sm"
                  onClick={() => openCreateApiKeyDialog(setCreateApiKeyForAdminId, setCreateApiKeyRequested)}
                  disabled={admins.length === 0}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New API Key
                </Button>
              </>
            )}
          </div>
        </div>

        <TabsContent value="accounts" className="space-y-6">
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
                  {Array.isArray(admins) &&
                    admins.map((admin) => (
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
                                <Key className="mr-2 h-4 w-4" />
                                Change Password
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCreateApiKeyForAdmin(admin.id)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Create API Key
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteAdmin(admin.id)}>
                                <Trash2 className="mr-2 h-4 w-4" />
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
        </TabsContent>

        <TabsContent value="api-keys" className="space-y-6">
          <ApiKeysPanel
            admins={admins}
            apiClient={apiClient}
            isActive={activeTab === "api-keys"}
            defaultAdminId={createApiKeyForAdminId}
            createRequested={createApiKeyRequested}
            reloadRequested={apiKeysReloadRequested}
            onCreateRequestHandled={() => setCreateApiKeyRequested(false)}
            onLoadingChange={setApiKeysLoading}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedAdmin} onOpenChange={() => setSelectedAdmin(null)}>
        {selectedAdmin && (
          <ChangePasswordDialog admin={selectedAdmin} apiClient={apiClient} onClose={() => setSelectedAdmin(null)} />
        )}
      </Dialog>

      {addingAdmin && (
        <AddItemDrawer
          table={table}
          apiClient={apiClient}
          entityCollectionPath={SYS_ADMINS_API}
          open={!!addingAdmin}
          onClose={() => setAddingAdmin(false)}
          onItemAdded={handleAdminAdded}
        />
      )}
    </div>
  )
}
