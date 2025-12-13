"use client"

import type { AppMode } from "./app-state"


// Updated interfaces to match the API response format
export interface FieldConstraints {
  default_value: any
  max_value: number | null
  min_value: number | null
  validator: string | null
}

export interface TableField {
  id: string
  name: string
  primary_key: boolean
  required: boolean
  system: boolean
  type: string
  unique: boolean
  constraints: FieldConstraints
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

export function getApiBaseUrl(): string {

  const mode = process?.env?.NODE_ENV || "production";
  const port = process?.env?.MANTIS_PORT || 7070;

  if (mode === "development") {
    // For debug mode, or non window sessions, pick port from env
    return `http://localhost:${port}`;
  }

  if (typeof window !== "undefined") {
    const { origin } = window.location;
    return `${origin}`;
  }

  return `http://localhost:${port}`;
}

export interface AppSettings {
  allowRegistration: boolean
  appName: string
  baseUrl: string
  emailVerificationRequired: boolean
  maintenanceMode: boolean
  maxFileSize: Number
  mode: AppMode
  sessionTimeout: Number
  adminSessionTimeout: Number
  mantisVersion: string
}

// API Response interface
interface ApiResponse<T> {
  data: T
  error?: string
  status: number
}

export class ApiClient {
  private token: string
  private onUnauthorized: (error: string) => void
  private onError?: (error: string, type?: "error" | "warning") => void

  constructor(
    token: string,
    onUnauthorized: (reason?: string | "") => void,
    onError?: (error: string, type?: "error" | "warning") => void,
  ) {
    this.token = token
    this.onUnauthorized = onUnauthorized
    this.onError = onError
  }

  private async realApiCall<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      const url = `${getApiBaseUrl()}${endpoint}`
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.token}`,
      };

      // only set content-type if body is not FormData
      if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
      }

      const response = await fetch(url, {
        ...options,
        headers,
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
  token: string
  user: Admin
}

export async function loginWithPassword(
  email: string,
  password: string
): Promise<LoginResponse> {
  // Real API call to /api/v1/auth/login
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identity: email,
        password: password,
        entity: "mb_admins"
      }),
    })

    // Handle non-JSON responses
    let responseData: any
    try {
      responseData = await response.json()
    } catch (jsonError) {
      throw new Error("Invalid response from server")
    }

    // Handle response structure: { status, data: { token, user }, error }
    if (responseData.status === 200 && responseData.data && responseData.data.token) {
      return {
        token: responseData.data.token,
        user: responseData.data.user
      }
    } else {
      // Handle error response
      const errorMessage = responseData.error || responseData.message || "Login failed"
      throw new Error(errorMessage)
    }
  } catch (error: any) {
    // Re-throw if it's already an Error with a message
    if (error instanceof Error) {
      throw error
    }
    throw new Error(error.message || "Network error occurred")
  }
}
