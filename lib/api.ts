"use client"

export interface FieldConstraints {
  default_value: any
  max_value: number | null
  min_value: number | null
  validator: string | null
}

export interface ForeignKeyConfig {
  entity: string // table name
  field: string // column ref
  on_update?: string // optional
  on_delete?: string // optional
}

export interface TableField {
  id: string
  name: string
  primary_key: boolean
  required: boolean
  system: boolean
  type: string
  precision?: string | null
  unique: boolean
  constraints: FieldConstraints
  foreign_key?: ForeignKeyConfig // optional foreign key configuration
}

export interface RuleConfig {
  expr: string
  mode: string
}

export interface SchemaRules {
  add: RuleConfig
  delete: RuleConfig
  get: RuleConfig
  list: RuleConfig
  update: RuleConfig
}

export interface TableSchema {
  fields: TableField[]
  has_api: boolean
  id: string
  name: string
  rules: SchemaRules
  system: boolean
  type: "base" | "auth" | "view"
  sql?: string
}

export interface TableMetadata {
  created: string
  id: string
  schema: TableSchema
  updated: string
}

export interface Admin {
  id: string
  email: string
  created: string
  updated: string
}

/** System admin REST API (list, CRUD). Login: `${SYS_ADMINS_API}/login`. */
export const SYS_ADMINS_API = "/api/v1/sys/admins" as const

/** Application settings (GET/PATCH). */
export const SYS_SETTINGS_CONFIG_API = "/api/v1/sys/settings/config" as const

/** Admin API keys (list, create, update, revoke). */
export const SYS_API_KEYS_API = "/api/v1/sys/api-keys" as const

/** OAuth provider registry (list, create, update, remove). */
export const SYS_OAUTH_PROVIDERS_API = "/api/v1/sys/oauth/providers" as const

/** Enable or disable OAuth providers per auth entity. */
export const SYS_OAUTH_ENTITY_CONFIG_API = "/api/v1/sys/oauth/entity-config" as const

export interface AdminApiKey {
  id: string
  entity_name: string
  user_id: string
  label: string
  permissions: unknown[]
  last_used: string | null
  created: string
  expires_at: string | null
}

export interface AdminApiKeyCreated extends AdminApiKey {
  key: string
}

export interface AdminApiKeyCreateRequest {
  user_id: string
  label?: string
  permissions?: unknown[]
  expires_at?: string
}

export interface ApiKeyUser {
  id: string
  label: string
}

/** Entity auth user API keys (list, create, revoke). */
export function entityApiKeysApi(entityName: string): string {
  return `/api/v1/auth/${encodeURIComponent(entityName)}/api-keys`
}

/** OAuth providers enabled for an auth entity (public list). */
export function entityOAuthProvidersApi(entityName: string): string {
  return `/api/v1/auth/${encodeURIComponent(entityName)}/oauth/providers`
}

/** Provider row from GET /auth/{entity}/oauth/providers (includes entity enablement). */
export interface EntityOAuthProvider {
  id: string
  name: string
  client_id?: string
  enabled?: boolean
  enabled_for_entity?: boolean
  [key: string]: unknown
}

export interface OAuthProvider {
  id: string
  name: string
  client_id?: string
  enabled?: boolean
  [key: string]: unknown
}

export interface OAuthProviderCreateRequest {
  name: string
  client_id: string
  client_secret: string
}

export interface OAuthProviderUpdateRequest {
  name?: string
  client_id?: string
  client_secret?: string
}

export interface OAuthEntityConfigRequest {
  entity_name: string
  provider_id: string
}

export interface OAuthEntityConfigResult {
  entity_name: string
  provider_id: string
  enabled: boolean
}

/** Resolve provider UUID used in entity-config requests. */
export function getOAuthProviderId(provider: { id?: string; provider_id?: string }): string {
  return provider.id ?? provider.provider_id ?? ""
}

/** Build URL to download or display an uploaded entity file. */
export function buildEntityFileUrl(entityName: string, fileName: string): string {
  return `${getApiBaseUrl()}/api/v1/files/${encodeURIComponent(entityName)}/${encodeURIComponent(fileName)}`
}

export interface AdminApiKeyUpdateRequest {
  label?: string
  expires_at?: string | null
}

/** Extract list items from direct arrays or paginated API responses. */
export function extractListItems<T>(response: unknown): T[] {
  if (Array.isArray(response)) {
    return response
  }

  if (response && typeof response === "object") {
    const record = response as Record<string, unknown>
    if (Array.isArray(record.items)) {
      return record.items as T[]
    }

    const data = record.data
    if (Array.isArray(data)) {
      return data as T[]
    }
    if (data && typeof data === "object") {
      const nested = data as Record<string, unknown>
      if (Array.isArray(nested.items)) {
        return nested.items as T[]
      }
    }
  }

  return []
}

/** Detect error objects returned by ApiClient.call's catch handler. */
export function getApiClientError(response: unknown): string | null {
  if (!response || typeof response !== "object") {
    return null
  }

  const record = response as { error?: unknown; status?: unknown }
  if (typeof record.error === "string" && record.error.length > 0) {
    const status = typeof record.status === "number" ? record.status : 0
    if (status >= 400 || status <= 0) {
      return record.error
    }
  }

  return null
}

/** HttpOnly cookie name set by the MantisBase backend on admin login/refresh; cleared on logout. */
export const ADMIN_SESSION_COOKIE = "admin_token" as const

/** Backend API base URL. Override with NEXT_PUBLIC_MANTIS_BASE_URL (e.g. https://api.example.com) to use an external backend. */
export function getApiBaseUrl(): string {
  const override = process.env.NEXT_PUBLIC_MANTIS_BASE_URL
  if (override !== undefined && override !== "") {
    return override.replace(/\/+$/, "")
  }

  if (typeof window !== "undefined") {
    return window.location.origin
  }

  const port = process?.env?.MANTIS_PORT || 7070
  return `http://127.0.0.1:${port}`
}

export interface SmtpConfig {
  host: string
  port: number
  user: string
  password: string
  from: string
  tls: boolean
}

export interface AppSettings {
  orgName: string
  siteDomain: string
  corsAllowedOrigins: string[]
  maxFileSize: number
  logRetentionDays: number
  disableAdminRegistration: boolean
  disableSchemaMutations: boolean
  emailVerificationRequired: boolean
  sessionTimeout: number
  adminSessionTimeout: number
  jwtEnableSetIssuer: boolean
  jwtEnableSetAudience: boolean
  smtp: SmtpConfig
}

// API Response interface
interface ApiResponse<T> {
  data: T
  error?: string
  status: number
}

function buildRequestHeaders(body: BodyInit | null | undefined, bearerToken?: string): Record<string, string> {
  const headers: Record<string, string> = {}

  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`
  }

  if (!(body instanceof FormData)) {
    headers["Content-Type"] = "application/json"
  }

  return headers
}

export class ApiClient {
  private bearerToken?: string
  private onUnauthorized: (error: string) => void
  private onError?: (error: string, type?: "error" | "warning") => void

  constructor(
    onUnauthorized: (reason?: string | "") => void,
    onError?: (error: string, type?: "error" | "warning") => void,
    bearerToken?: string,
  ) {
    this.bearerToken = bearerToken
    this.onUnauthorized = onUnauthorized
    this.onError = onError
  }

  private async realApiCall<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      const url = `${getApiBaseUrl()}${endpoint}`
      const headers = buildRequestHeaders(options.body, this.bearerToken)

      const response = await fetch(url, {
        ...options,
        credentials: "include",
        headers: {
          ...headers,
          ...(options.headers as Record<string, string> | undefined),
        },
      })

      // DELETE or No Content
      if (response.status === 204) {
        return { data: {} as T, status: 204, error: "" }
      }

      const responseData = await response.json()

      // Ensure the structure always matches ApiResponse<T>
      // The API should always return { data: ..., status: ..., error: ... }
      // Handle both HTTP status and JSON body status
      const jsonStatus = responseData.status ?? response.status
      const jsonError = responseData.error ?? ""
      
      // Extract data from response - should be an array for list endpoints
      let data = responseData.data
      
      // If data is missing, check if the entire response is an array (fallback)
      if (data === undefined || data === null) {
        // If responseData itself is an array, use it
        if (Array.isArray(responseData)) {
          data = responseData as T
        } else {
          // Otherwise default based on expected type
          data = ({} as T)
        }
      }

      return {
        data: data,
        error: jsonError,
        status: jsonStatus,
      }
    } catch (error: any) {
      return {
        data: {} as T,
        error: error.message || "Network error occurred",
        status: 500, // could use 500 if you prefer
      }
    }
  }

  async call<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      let response: ApiResponse<T> = await this.realApiCall<T>(endpoint, options)

      // Unauthorized handling - check both HTTP status and JSON status
      if (response.status === 401 || response.status === 403) {
        this.onUnauthorized(response.error || "Unauthorized")
        throw new Error(response.error || "Unauthorized")
      }

      // General error handling - check JSON status from API response
      // The API returns status in the JSON body: { data: [], status: 200, error: "" }
      // Only treat as error if status >= 400 or error string is non-empty
      if (response.status >= 400 || response.status <= 0) {
        const errorMsg = response.error && response.error.length > 0 
          ? response.error 
          : "Request failed"
        if(errorMsg === "Failed to fetch") {
          const finalError = `Failed to fetch '${endpoint}'. Could not reach the server!`
          this.onError?.(finalError, "error")
          throw new Error(finalError)
        }
        this.onError?.(errorMsg, "error")
        throw new Error(errorMsg)
      }
      
      // If there's an error message but status is OK, log it but don't throw
      if (response.error && response.error.length > 0) {
        console.warn(`API warning for ${endpoint}:`, response.error)
      }

      // Return the data - should be an array for list endpoints
      return response.data
    } catch (error: any) {
      return {
        data: null as T,
        error: error.message || "Could not connect to the server!",
        status: 500, // could use 500 if you prefer
      } as any
    }
  }
}

export interface LoginResponse {
  user: Admin
}

export async function loginWithPassword(
  email: string,
  password: string
): Promise<LoginResponse> {
  try {
    const response = await fetch(`${getApiBaseUrl()}${SYS_ADMINS_API}/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identity: email,
        password: password,
      }),
    })

    // Handle non-JSON responses
    let responseData: any
    try {
      responseData = await response.json()
    } catch (jsonError) {
      throw new Error("Invalid response from server")
    }

    // Session cookie is set by the backend via Set-Cookie; JS must not read or store the token.
    if (responseData.status === 200 && responseData.data?.user) {
      return {
        user: responseData.data.user,
      }
    }

    const errorMessage = responseData.error || responseData.message || "Login failed"
    throw new Error(errorMessage)
  } catch (error: any) {
    // Re-throw if it's already an Error with a message
    if (error instanceof Error) {
      throw error
    }
    throw new Error(error.message || "Network error occurred")
  }
}

export async function checkAuthSession(): Promise<boolean> {
  try {
    const response = await fetch(`${getApiBaseUrl()}${SYS_ADMINS_API}`, {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    })

    if (response.status === 401 || response.status === 403) {
      return false
    }

    const responseData = await response.json()
    return responseData.status === 200
  } catch {
    return false
  }
}

export async function logoutSession(): Promise<void> {
  try {
    await fetch(`${getApiBaseUrl()}${SYS_ADMINS_API}/logout`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.warn("Failed to clear admin session cookie:", error)
  }
}
