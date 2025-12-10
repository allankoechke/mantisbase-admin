"use client"

import * as React from "react"
import { Table, Settings, Shield, LogOut, FileText, RefreshCw, ExternalLink, AlertTriangle } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ApiClient, type TableMetadata, type Admin, type AppSettings } from "@/lib/api"
import { DatabaseSection } from "./database/database-section"
import { AdminsSection } from "./admins/admins-section"
import { SettingsSection } from "./settings/settings-section"
import { LogsSection } from "./logs/logs-section"
import { SyncSection } from "./sync/sync-section"
import { useToast } from "@/hooks/use-toast"
import { ThemeToggle } from "./theme-toggle"
import { useRouter } from "@/lib/router"
import { useAppState, type AppMode } from "@/lib/app-state"
import { cn } from "@/lib/utils"

interface AdminDashboardProps {
  token: string
  onLogout: () => void
}

export function AdminDashboard({ token, onLogout }: AdminDashboardProps) {
  const [mounted, setMounted] = React.useState(false)
  const [tables, setTables] = React.useState<TableMetadata[]>([])
  const [admins, setAdmins] = React.useState<Admin[]>([])
  const [loading, setLoading] = React.useState(true)
  const [settings, setSettings] = React.useState<AppSettings | null>(null)
  const [authErrorDialog, setAuthErrorDialog] = React.useState(false)
  const [authErrorReason, setAuthErrorReason] = React.useState("") // Auth error reason
  const { toast } = useToast()
  const { route, navigate } = useRouter()
  const { mode } = useAppState()

  const showError = React.useCallback(
    (error: string, type: "error" | "warning" = "error") => {
      try {
        // Prevent error loops by checking if error is already being shown
        if (error.includes("Unauthorized") || error.includes("auth")) {
          return // Don't show toast for auth errors, handle with dialog
        }

        toast({
          variant: type === "error" ? "destructive" : "default",
          title: type === "error" ? "Error" : "Warning",
          description: error,
          duration: 10000,
        })
      } catch (toastError) {
        console.warn("Failed to show error toast:", toastError)
      }
    },
    [toast],
  )

  const handleUnauthorized = React.useCallback((reason?: string | "") => {
    try {
      setAuthErrorReason(reason || "")  // Set the auth error string
      setAuthErrorDialog(true)    // Set the auth dialog to open
      handleLogout()
    } catch (error) {
      console.warn("Failed to handle unauthorized:", error)
    }
  }, [])

  const [apiClient, setApiClient] = React.useState(
    () => new ApiClient(token || "", handleUnauthorized, showError),
  )

  React.useEffect(() => {
    setMounted(true)
    loadData()
  }, [])

  // Update API client when mode or settings change
  React.useEffect(() => {
    const newApiClient = new ApiClient(token || "", handleUnauthorized, showError)
    setApiClient(newApiClient)
  }, [token, handleUnauthorized, showError])

  const loadData = async () => {
    // Set default settings if loading fails
    setSettings({
      appName: "ACME Mantis Project",
      baseUrl: "http://127.0.0.1:7070",
      mantisVersion: "0.0.0",
      maintenanceMode: false,
      maxFileSize: 10,
      allowRegistration: true,
      emailVerificationRequired: false,
      sessionTimeout: 84000,
      adminSessionTimeout: 3600,
      mode: mode,
    })

    try {
      setLoading(true)

      const [tablesData, adminsData, settingsData] = await Promise.all([
        apiClient.call<TableMetadata[]>("/api/v1/tables"),
        apiClient.call<Admin[]>("/api/v1/admins"),
        apiClient.call<AppSettings>("/api/v1/settings/config"),
      ])

      setTables(tablesData)
      setAdmins(adminsData)
      setSettings(settingsData)
    } catch (error) {
      console.error("Failed to load data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    try {
      localStorage.removeItem("admin_token")
      onLogout()
    } catch (error) {
      console.warn("Failed to logout:", error)
    }
  }

  const handleAuthErrorLogin = () => {
    try {
      setAuthErrorDialog(false)
      handleLogout()
    } catch (error) {
      console.warn("Failed to handle auth error login:", error)
    }
  }

  const handleModeChange = (newMode: AppMode, baseUrl?: string) => {
    // Update API client when mode changes (mode is handled via app state)
    const newApiClient = new ApiClient(token || "", handleUnauthorized, showError)
    setApiClient(newApiClient)

    // Reload data with new mode
    loadData()
  }

  const sidebarItems = [
    {
      title: "Entities",
      icon: Table,
      id: "entities",
      path: "/entities",
    },
    {
      title: "Logs",
      icon: FileText,
      id: "logs",
      path: "/logs",
    },
    {
      title: "Admins",
      icon: Shield,
      id: "admins",
      path: "/admins",
    },
    {
      title: "Settings",
      icon: Settings,
      id: "settings",
      path: "/settings",
    },
  ]

  // Extract the section from the route path safely
  const getCurrentSection = () => {
    try {
      // Handle route patterns like "/entities/:name" -> "entities"
      const pathParts = route.path.split("/").filter(Boolean)
      return pathParts[0] || "entities"
    } catch (error) {
      console.warn("Error parsing route:", error)
      return "entities"
    }
  }

  const currentSection = getCurrentSection()

  if (!mounted) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider open={false}>
      <div className="flex min-h-screen w-full">
        <Sidebar collapsible="icon" className="border-r" style={{width: "4rem", minWidth: "4rem", maxWidth: "4rem", "--sidebar-width": "4rem", "--sidebar-width-icon": "4rem"} as React.CSSProperties}>
          <SidebarHeader className="border-b p-0 w-full">
            <div className="flex h-16 w-full items-center justify-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Shield className="h-6 w-6" />
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-0 py-2 w-full">
            <SidebarMenu className="space-y-1 w-full">
              {sidebarItems.map((item) => (
                <SidebarMenuItem key={item.id} className="w-full">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton
                          onClick={() => {
                            try {
                              navigate(item.path, undefined, undefined)
                            } catch (error) {
                              console.warn("Failed to navigate:", error)
                            }
                          }}
                          isActive={currentSection === item.id}
                          style={{ height: "4rem", minHeight: "4rem" }}
                          className={cn(
                            "w-full justify-center p-0 mx-0 rounded-none border-l-2 border-transparent min-w-full",
                            currentSection === item.id && "border-l-primary bg-accent"
                          )}
                        >
                          <item.icon className={cn(
                            "h-6 w-6",
                            currentSection === item.id && "text-primary"
                          )} />
                          <span className="sr-only">{item.title}</span>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{item.title}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="border-t p-0 w-full">
            <SidebarMenu className="space-y-1 w-full">
              <SidebarMenuItem className="w-full">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-full">
                        <ThemeToggle iconOnly />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Toggle Theme</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </SidebarMenuItem>
              <SidebarMenuItem className="w-full">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton asChild style={{ height: "4rem", minHeight: "4rem" }} className="w-full justify-center p-0 mx-0 rounded-none min-w-full">
                        <a href="https://docs.mantisbase.com" target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center">
                          <ExternalLink className="h-6 w-6" />
                          <span className="sr-only">Documentation</span>
                        </a>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Documentation</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </SidebarMenuItem>
              <SidebarMenuItem className="w-full">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton onClick={handleLogout} className="h-12 w-full justify-center p-0 mx-0 rounded-none min-w-full">
                        <LogOut className="h-6 w-6" />
                        <span className="sr-only">Logout</span>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Logout</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1">
          <main className="pl-4">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              </div>
            ) : (
              <>
                {currentSection === "entities" && (
                  <DatabaseSection apiClient={apiClient} tables={tables} onTablesUpdate={setTables} />
                )}
                {currentSection === "admins" && (
                  <AdminsSection admins={admins} apiClient={apiClient} onAdminsUpdate={setAdmins} />
                )}
                {currentSection === "logs" && <LogsSection apiClient={apiClient} />}
                {currentSection === "sync" && <SyncSection />}
                {currentSection === "settings" && (
                  <SettingsSection
                    apiClient={apiClient}
                    settings={settings}
                    onSettingsUpdate={setSettings}
                    onModeChange={handleModeChange}
                  />
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Auth Error Dialog */}
      <Dialog open={authErrorDialog} onOpenChange={setAuthErrorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Authentication Error
            </DialogTitle>
            <DialogDescription>
              Your session has expired or you don't have permission to access this resource. Please log in again to
              continue.
            </DialogDescription>
            {
              authErrorReason.length > 0 && (
                <DialogDescription>
                  {authErrorReason}
                </DialogDescription>
              )
            }
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAuthErrorDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAuthErrorLogin}>Login Again</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
