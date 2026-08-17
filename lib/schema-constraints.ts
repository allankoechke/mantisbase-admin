/**
 * Normalize and validate field `constraints` when creating/updating entity schemas.
 * Aligns with runtime entity value casting in add-item-drawer / edit-item-drawer.
 */

import type { FieldConstraints } from "@/lib/api"
import { isIntFieldType, isUnsignedPrecision } from "@/lib/field-types"

const NUMERIC_TYPES = new Set(["double", "int"])

export interface RawConstraintsInput {
  default_value: unknown
  min_value: unknown
  max_value: unknown
  validator: string | null
}

export type ConstraintsNormalizeResult =
  | { ok: true; constraints: FieldConstraints }
  | { ok: false; message: string }

/**
 * Coerce min/max bounds from UI or API into a finite number or null.
 */
export function normalizeConstraintBound(value: unknown): { ok: true; value: number | null } | { ok: false; message: string } {
  if (value === null || value === undefined || value === "") {
    return { ok: true, value: null }
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return { ok: false, message: "Min/max must be valid numbers." }
    }
    return { ok: true, value }
  }
  if (typeof value === "string") {
    const t = value.trim()
    if (t === "") {
      return { ok: true, value: null }
    }
    const n = Number.parseFloat(t)
    if (!Number.isFinite(n)) {
      return { ok: false, message: "Min/max must be valid numbers." }
    }
    return { ok: true, value: n }
  }
  return { ok: false, message: "Min/max must be numbers or empty." }
}

function validateMinMaxOrder(min: number | null, max: number | null): string | null {
  if (min !== null && max !== null && min > max) {
    return "Min value cannot be greater than max value."
  }
  return null
}

function isUnsignedIntegerField(fieldType: string, precision?: string | null): boolean {
  if (fieldType === "int") {
    return isUnsignedPrecision(precision)
  }

  return fieldType.startsWith("uint")
}

function parseDefaultValue(
  fieldType: string,
  raw: unknown,
  precision?: string | null,
): { ok: true; value: unknown } | { ok: false; message: string } {
  if (raw === null || raw === undefined) {
    return { ok: true, value: null }
  }

  if (typeof raw === "string") {
    const t = raw.trim()
    if (t === "") {
      return { ok: true, value: null }
    }
  }

  switch (fieldType) {
    case "string":
    case "xml":
    case "blob": {
      return { ok: true, value: typeof raw === "string" ? raw : String(raw) }
    }

    case "int":
    case "int8":
    case "int16":
    case "int32":
    case "int64":
    case "uint8":
    case "uint16":
    case "uint32":
    case "uint64": {
      const n = typeof raw === "number" ? raw : Number.parseFloat(String(raw).trim())
      if (!Number.isFinite(n)) {
        return { ok: false, message: "Default value must be a valid number for integer fields." }
      }
      if (!Number.isInteger(n)) {
        return { ok: false, message: "Default value must be an integer for this field type." }
      }
      if (isUnsignedIntegerField(fieldType, precision) && n < 0) {
        return { ok: false, message: "Default value must be non-negative for unsigned integer fields." }
      }
      return { ok: true, value: n }
    }

    case "double": {
      const n = typeof raw === "number" ? raw : Number.parseFloat(String(raw).trim())
      if (!Number.isFinite(n)) {
        return { ok: false, message: "Default value must be a valid number." }
      }
      return { ok: true, value: n }
    }

    case "bool": {
      if (typeof raw === "boolean") {
        return { ok: true, value: raw }
      }
      const s = String(raw).trim().toLowerCase()
      if (s === "true" || s === "1") {
        return { ok: true, value: true }
      }
      if (s === "false" || s === "0") {
        return { ok: true, value: false }
      }
      return { ok: false, message: 'Default value must be "true" or "false" for boolean fields.' }
    }

    case "json": {
      if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
        return { ok: true, value: raw }
      }
      if (Array.isArray(raw)) {
        return { ok: true, value: raw }
      }
      try {
        const parsed = JSON.parse(String(raw).trim())
        return { ok: true, value: parsed }
      } catch {
        return { ok: false, message: "Default value must be valid JSON." }
      }
    }

    case "date": {
      if (raw instanceof Date) {
        return isNaN(raw.getTime())
          ? { ok: false, message: "Default value must be a valid date." }
          : { ok: true, value: raw.toISOString() }
      }
      const d = new Date(String(raw).trim())
      if (isNaN(d.getTime())) {
        return { ok: false, message: "Default value must be a valid date." }
      }
      return { ok: true, value: d.toISOString() }
    }

    case "file":
    case "files": {
      const v = raw === null || raw === undefined ? null : String(raw).trim()
      return { ok: true, value: v === "" ? null : v }
    }

    default:
      return { ok: true, value: raw }
  }
}

/**
 * Format a constraint default for a text input (handles 0, false, JSON objects).
 */
export function formatConstraintDefaultForInput(fieldType: string, value: unknown): string {
  if (value === null || value === undefined) {
    return ""
  }
  if (fieldType === "json" && (typeof value === "object" || Array.isArray(value))) {
    try {
      return JSON.stringify(value)
    } catch {
      return ""
    }
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false"
  }
  return String(value)
}

/**
 * Validate and cast constraints for the schema API from raw UI/API state.
 */
export function normalizeConstraintsForFieldType(
  fieldType: string,
  input: RawConstraintsInput,
  precision?: string | null,
): ConstraintsNormalizeResult {
  const minR = normalizeConstraintBound(input.min_value)
  if (!minR.ok) {
    return { ok: false, message: minR.message }
  }
  const maxR = normalizeConstraintBound(input.max_value)
  if (!maxR.ok) {
    return { ok: false, message: maxR.message }
  }

  const orderErr = validateMinMaxOrder(minR.value, maxR.value)
  if (orderErr) {
    return { ok: false, message: orderErr }
  }

  if (NUMERIC_TYPES.has(fieldType) || isIntFieldType(fieldType)) {
    const isInteger = isIntFieldType(fieldType)
    const minInt = minR.value !== null && isInteger && !Number.isInteger(minR.value)
    const maxInt = maxR.value !== null && isInteger && !Number.isInteger(maxR.value)
    if (minInt || maxInt) {
      return { ok: false, message: "Min/max for integer types must be whole numbers." }
    }
    if (isUnsignedIntegerField(fieldType, precision)) {
      if (minR.value !== null && minR.value < 0) {
        return { ok: false, message: "Min cannot be negative for unsigned integer fields." }
      }
      if (maxR.value !== null && maxR.value < 0) {
        return { ok: false, message: "Max cannot be negative for unsigned integer fields." }
      }
    }
  }

  const defR = parseDefaultValue(fieldType, input.default_value, precision)
  if (!defR.ok) {
    return { ok: false, message: defR.message }
  }

  const validator =
    input.validator === null || input.validator === undefined || input.validator === ""
      ? null
      : String(input.validator)

  return {
    ok: true,
    constraints: {
      default_value: defR.value,
      min_value: minR.value,
      max_value: maxR.value,
      validator,
    },
  }
}
