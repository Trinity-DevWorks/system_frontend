/**
 * @param {{ item_code?: unknown; name?: unknown; id?: unknown } | null | undefined} item
 * @returns {string}
 */
export function formatItemOptionLabel(item) {
  const code = typeof item?.item_code === "string" ? item.item_code.trim() : "";
  const name = String(item?.name ?? item?.id ?? "");
  return code ? `${code} — ${name}` : name;
}

/**
 * @param {{ code?: unknown; name?: unknown } | null | undefined} uom
 * @returns {string}
 */
export function formatItemBaseUomLabel(uom) {
  if (!uom || typeof uom !== "object") return "";
  const name = typeof uom.name === "string" ? uom.name.trim() : "";
  const code = typeof uom.code === "string" ? uom.code.trim() : "";
  return name || code;
}
