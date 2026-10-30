/** Dynamic form field from ContributorAdminFormDynamic API */
export interface DynamicField {
  DBFieldName: string
  DisplayFieldName: string
}

export function isContributorField(field: DynamicField | string): boolean {
  const name = typeof field === 'string' ? field : field.DBFieldName
  return /^contributor$/i.test(name.trim())
}

/** Fields shown in forms / bulk templates (excludes Contributor). */
export function getVisibleDynamicFields(fields: DynamicField[]): DynamicField[] {
  return fields.filter((f) => !isContributorField(f))
}

/**
 * Normalize a spreadsheet/form row so keys are DBFieldName values.
 * Accepts either DisplayFieldName or DBFieldName as source keys.
 */
export function mapRowToDbFieldKeys(
  row: Record<string, any>,
  fields: DynamicField[]
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const f of getVisibleDynamicFields(fields)) {
    const raw = row[f.DBFieldName] ?? row[f.DisplayFieldName] ?? ''
    out[f.DBFieldName] = String(raw ?? '').trim()
  }
  return out
}

/** Parse fully dynamic DBFieldName / DisplayFieldName pairs from API response. */
export function parseDynamicFieldsFromApi(payload: any): DynamicField[] {
  if (!Array.isArray(payload?.data) || payload.data.length === 0) {
    return []
  }
  return payload.data
    .filter((item: any) => item && (item.DBFieldName || item.dbFieldName))
    .map((item: any) => ({
      DBFieldName: String(item.DBFieldName || item.dbFieldName).trim(),
      DisplayFieldName: String(
        item.DisplayFieldName || item.displayFieldName || item.DBFieldName || item.dbFieldName
      ).trim(),
    }))
    .filter((f: DynamicField) => f.DBFieldName.length > 0)
}
