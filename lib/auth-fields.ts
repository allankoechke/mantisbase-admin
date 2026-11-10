import type { TableField } from "@/lib/api"

/** Auth-entity fields that are optional when OAuth (or other methods) can create accounts. */
const OPTIONAL_AUTH_FIELD_NAMES = new Set(["password", "avatar"])

export function isOptionalAuthField(fieldName: string): boolean {
  return OPTIONAL_AUTH_FIELD_NAMES.has(fieldName)
}

/**
 * Whether a field must be filled in the admin record form.
 * Password and avatar are never required on auth entities (OAuth-capable accounts).
 */
export function isFieldRequiredInForm(
  field: Pick<TableField, "name" | "required">,
  entityType: string,
): boolean {
  if (entityType === "auth" && isOptionalAuthField(field.name)) {
    return false
  }
  return Boolean(field.required)
}

/** Normalize auth schema field flags for UI (does not PATCH the server). */
export function normalizeAuthSchemaField<T extends Pick<TableField, "name" | "required" | "system">>(
  field: T,
  entityType: string,
): T {
  if (entityType !== "auth" || !isOptionalAuthField(field.name)) {
    return field
  }

  return {
    ...field,
    required: false,
  }
}

const PASSWORD_ALPHABET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*-_=+"

/** Cryptographically random password suitable for admin-created auth users. */
export function generateRandomPassword(length = 20): string {
  const size = Math.max(12, Math.min(length, 64))
  const bytes = new Uint8Array(size)
  crypto.getRandomValues(bytes)
  let result = ""
  for (let i = 0; i < size; i++) {
    result += PASSWORD_ALPHABET[bytes[i]! % PASSWORD_ALPHABET.length]
  }
  return result
}
