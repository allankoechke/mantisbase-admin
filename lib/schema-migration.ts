import type { ApiClient, TableField, TableMetadata } from "@/lib/api"
import {
  appendPrecisionToFieldPayload,
  normalizeFieldTypeForEditor,
  schemaFieldsNeedMigration,
} from "@/lib/field-types"

export function normalizeSchemaField(field: TableField): TableField {
  const { type, precision } = normalizeFieldTypeForEditor(field)
  const normalized: TableField = { ...field, type }

  if (type === "int") {
    normalized.precision = precision
  } else {
    normalized.precision = undefined
  }

  return normalized
}

export function normalizeTableSchema(table: TableMetadata): TableMetadata {
  if (!table.schema?.fields) {
    return table
  }

  return {
    ...table,
    schema: {
      ...table.schema,
      fields: table.schema.fields.map(normalizeSchemaField),
    },
  }
}

export function buildFieldPatchPayload(field: TableField): Record<string, unknown> {
  const normalized = normalizeSchemaField(field)
  const fieldData: Record<string, unknown> = {
    id: field.id,
    name: field.name,
    type: normalized.type,
    primary_key: field.primary_key,
    required: field.required,
    system: field.system ?? false,
    unique: field.unique ?? false,
    constraints: field.constraints ?? {
      default_value: null,
      max_value: null,
      min_value: null,
      validator: null,
    },
  }

  appendPrecisionToFieldPayload(fieldData, normalized)

  if (field.foreign_key?.entity && field.foreign_key?.field) {
    fieldData.foreign_key = field.foreign_key
  }

  return fieldData
}

export async function migrateSchemaFieldsIfNeeded(
  apiClient: ApiClient,
  table: TableMetadata,
): Promise<TableMetadata | null> {
  const fields = table.schema?.fields ?? []
  if (!schemaFieldsNeedMigration(fields)) {
    return null
  }

  const updatedTable = await apiClient.call<TableMetadata>(`/api/v1/schemas/${table.schema.name}`, {
    method: "PATCH",
    body: JSON.stringify({
      fields: fields.map(buildFieldPatchPayload),
    }),
  })

  if ((updatedTable as { error?: unknown[] })?.error?.length) {
    throw (updatedTable as { error: unknown[] }).error
  }

  return normalizeTableSchema(updatedTable)
}

/**
 * Normalize schemas in memory and persist legacy field-type migrations to the backend.
 */
export async function applySchemaListMigration(
  apiClient: ApiClient,
  tables: TableMetadata[],
  onTableMigrated?: (table: TableMetadata) => void,
): Promise<TableMetadata[]> {
  let result = tables.map(normalizeTableSchema)

  for (const table of tables) {
    if (!schemaFieldsNeedMigration(table.schema?.fields ?? [])) {
      continue
    }

    try {
      const migrated = await migrateSchemaFieldsIfNeeded(apiClient, table)
      if (migrated) {
        result = result.map((entry) => (entry.id === migrated.id ? migrated : entry))
        onTableMigrated?.(migrated)
      }
    } catch (error) {
      console.error(`Failed to migrate schema "${table.schema.name}":`, error)
    }
  }

  return result
}
