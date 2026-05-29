export const BRAND_CREATE_SAVE_INTENT_KEY = "brandDrawer:createSaveIntent";
export const BRAND_CREATE_SAVE_INTENT_EVENT = "brandDrawer:createSaveIntent:change";

export const CODE_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

/**
 * @param {import("antd").FormInstance} form
 * @param {{ code: string; name: string; parent_brand_id: number | undefined; is_active: boolean }} defaults
 */
export function isCreateDirtyVsDefaults(form, defaults) {
  const v = form.getFieldsValue(true);
  const code = String(v.code ?? "").trim();
  const name = String(v.name ?? "").trim();
  const parentId = v.parent_brand_id ?? undefined;
  const defaultParent = defaults.parent_brand_id ?? undefined;
  const isActive = v.is_active !== false;

  if (code !== String(defaults.code ?? "").trim()) return true;
  if (name !== String(defaults.name ?? "").trim()) return true;
  if (parentId !== defaultParent) return true;
  if (isActive !== Boolean(defaults.is_active)) return true;
  return false;
}

/**
 * @param {import("antd").FormInstance} form
 * @param {Record<string, unknown>} row
 */
export function isEditDirtyVsLoaded(form, row) {
  const v = form.getFieldsValue(true);
  const code = String(v.code ?? "").trim();
  const name = String(v.name ?? "").trim();
  const parentId = v.parent_brand_id ?? null;
  const rowParent = row.parent_brand_id ?? null;
  const isActive = v.is_active !== false;

  if (code !== String(row.code ?? "").trim()) return true;
  if (name !== String(row.name ?? "").trim()) return true;
  if (parentId !== rowParent) return true;
  if (isActive !== Boolean(row.is_active)) return true;
  return false;
}

/**
 * @param {string} code
 * @param {string} name
 */
export function requiredFieldsValid(code, name) {
  const c = String(code ?? "")
    .trim()
    .toUpperCase();
  const n = String(name ?? "").trim();
  if (!c || !n) return false;
  if (!CODE_PATTERN.test(c)) return false;
  return true;
}

/** @param {Record<string, unknown>} row */
export function toBrandCacheRow(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    parent_brand_id: row.parent_brand_id ?? null,
    parent_brand: row.parent_brand ?? null,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** @param {unknown[]} list */
export function sortBrandsByName(list) {
  return [...list].sort((a, b) =>
    String(/** @type {{ name?: string }} */ (a).name ?? "").localeCompare(
      String(/** @type {{ name?: string }} */ (b).name ?? ""),
      undefined,
      { sensitivity: "base" },
    ),
  );
}

/** @param {Record<string, unknown>} values */
export function brandFormValuesToPayload(values) {
  const parentRaw = values.parent_brand_id;
  const parentBrandId =
    parentRaw === undefined || parentRaw === null || parentRaw === ""
      ? null
      : Number(parentRaw);

  return {
    code: String(values.code ?? "").trim().toUpperCase(),
    name: String(values.name ?? "").trim(),
    parent_brand_id: parentBrandId,
    is_active: Boolean(values.is_active),
  };
}

/**
 * @param {unknown[]} brands
 * @param {number | null | undefined} excludeBrandId
 */
export function buildParentBrandOptions(brands, excludeBrandId) {
  if (!Array.isArray(brands)) return [];
  return brands
    .filter((row) => {
      const id = row?.id;
      if (id == null) return false;
      if (excludeBrandId != null && Number(id) === Number(excludeBrandId)) return false;
      return true;
    })
    .map((row) => {
      const code = String(row?.code ?? "").trim();
      const name = String(row?.name ?? "").trim();
      const label = code && name ? `${name} (${code})` : name || code || String(row.id);
      return { value: Number(row.id), label };
    });
}
