// Editable-form counterpart to lib/kentico-item-fields.ts (which is
// read-only, for the consumer preview). The Page.customFields column stores
// an ordered { key, value }[] array rather than a plain object so that
// unrecognized/legacy keys (e.g. _kenticoNodeId, _kenticoClassName, or any
// real Kentico field our Form tab doesn't have a dedicated input for) round-
// trip untouched through a save, instead of being silently dropped.

export type CustomField = { key: string; value: string };

export function parseCustomFieldsArray(json: string | null): CustomField[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getCF(fields: CustomField[], key: string): string {
  return fields.find((f) => f.key === key)?.value ?? "";
}

export function setCF(fields: CustomField[], key: string, value: string): CustomField[] {
  const existing = fields.some((f) => f.key === key);
  if (!existing) {
    if (!value) return fields;
    return [...fields, { key, value }];
  }
  return fields.map((f) => (f.key === key ? { ...f, value } : f));
}

export function serializeCustomFields(fields: CustomField[]): string | null {
  const cleaned = fields.filter((f) => f.key);
  return cleaned.length ? JSON.stringify(cleaned) : null;
}
