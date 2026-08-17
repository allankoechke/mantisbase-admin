import type { ApiKeyUser } from "@/lib/api"

const DEFAULT_LABEL_FIELDS = ["email", "name", "username"] as const

export function getEntityUserLabel(
  user: Record<string, unknown>,
  preferredFields: readonly string[] = DEFAULT_LABEL_FIELDS,
): string {
  for (const field of preferredFields) {
    const value = user[field]
    if (typeof value === "string" && value.trim()) {
      return value
    }
  }

  if (user.id !== undefined && user.id !== null) {
    return String(user.id)
  }

  return "Unknown user"
}

export function toApiKeyUsers(records: Record<string, unknown>[]): ApiKeyUser[] {
  return records.map((record) => ({
    id: String(record.id),
    label: getEntityUserLabel(record),
  }))
}
