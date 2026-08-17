/** Supported entity field types in the schema editor. */
export const dataTypes = [
  "string",
  "double",
  "date",
  "int",
  "json",
  "bool",
  "file",
  "files",
] as const

/** Legacy types removed from the editor; normalized to `string` when loading schemas. */
const LEGACY_STRING_TYPES = new Set(["xml", "blob"])

export function isLegacyStringFieldType(type: string): boolean {
  return LEGACY_STRING_TYPES.has(type)
}

/** Integer precision sizes for fields with type `int`. */
export const intPrecisions = [
  "u8",
  "u16",
  "u32",
  "u64",
  "i8",
  "i16",
  "i32",
  "i64",
] as const

export type IntPrecision = (typeof intPrecisions)[number]

export const DEFAULT_INT_PRECISION: IntPrecision = "i32"

const LEGACY_INT_TYPE_TO_PRECISION: Record<string, IntPrecision> = {
  int8: "i8",
  int16: "i16",
  int32: "i32",
  int64: "i64",
  uint8: "u8",
  uint16: "u16",
  uint32: "u32",
  uint64: "u64",
}

const LEGACY_INT_TYPES = new Set(Object.keys(LEGACY_INT_TYPE_TO_PRECISION))

export function isIntFieldType(type: string): boolean {
  return type === "int" || LEGACY_INT_TYPES.has(type)
}

export function isNumericFieldType(type: string): boolean {
  return isIntFieldType(type) || type === "double"
}

export function isUnsignedPrecision(precision: string | null | undefined): boolean {
  return precision?.startsWith("u") ?? false
}

export function resolveFieldPrecision(field: {
  type: string
  precision?: string | null
}): string | null {
  if (field.type === "int") {
    return field.precision ?? DEFAULT_INT_PRECISION
  }

  return LEGACY_INT_TYPE_TO_PRECISION[field.type] ?? null
}

export function formatFieldTypeDisplay(field: {
  type: string
  precision?: string | null
}): string {
  if (field.type === "int") {
    const precision = field.precision ?? DEFAULT_INT_PRECISION
    return `int(${precision})`
  }

  return field.type
}

export function normalizeFieldTypeForEditor(field: {
  type: string
  precision?: string | null
}): { type: string; precision: string | null } {
  if (field.type === "int") {
    return {
      type: "int",
      precision: field.precision ?? DEFAULT_INT_PRECISION,
    }
  }

  const legacyPrecision = LEGACY_INT_TYPE_TO_PRECISION[field.type]
  if (legacyPrecision) {
    return {
      type: "int",
      precision: legacyPrecision,
    }
  }

  if (LEGACY_STRING_TYPES.has(field.type)) {
    return {
      type: "string",
      precision: null,
    }
  }

  return {
    type: field.type,
    precision: field.precision ?? null,
  }
}

export function applyFieldTypeChange(
  currentType: string,
  nextType: string,
  currentPrecision?: string | null,
): { type: string; precision: string | null } {
  if (nextType === "int") {
    return {
      type: "int",
      precision: currentType === "int" ? (currentPrecision ?? DEFAULT_INT_PRECISION) : DEFAULT_INT_PRECISION,
    }
  }

  return {
    type: nextType,
    precision: null,
  }
}

export function appendPrecisionToFieldPayload(
  fieldData: Record<string, unknown>,
  field: { type: string; precision?: string | null },
): void {
  if (field.type === "int") {
    fieldData.precision = field.precision ?? DEFAULT_INT_PRECISION
  }
}

/** True when a field still uses a removed legacy type from the API. */
export function fieldNeedsTypeMigration(field: { type: string }): boolean {
  return LEGACY_INT_TYPES.has(field.type) || LEGACY_STRING_TYPES.has(field.type)
}

export function schemaFieldsNeedMigration(fields: { type: string }[]): boolean {
  return fields.some(fieldNeedsTypeMigration)
}
