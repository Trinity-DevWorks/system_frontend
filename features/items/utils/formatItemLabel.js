/**
 * @param {{ item_code?: unknown; name?: unknown; id?: unknown } | null | undefined} item
 * @returns {string}
 */
export function formatItemOptionLabel(item) {
  const code = typeof item?.item_code === "string" ? item.item_code.trim() : "";
  const name = String(item?.name ?? item?.id ?? "");
  return code ? `${code} — ${name}` : name;
}
