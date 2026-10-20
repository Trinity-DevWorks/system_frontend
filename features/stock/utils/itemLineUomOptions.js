"use client";

import { Tag } from "antd";

/**
 * Prefer UOM code; fall back to name (same as sales invoice lines).
 * @param {{ code?: string; name?: string } | null | undefined} uom
 */
function itemLineUomCodeLabel(uom) {
  const code = typeof uom?.code === "string" ? uom.code.trim() : "";
  if (code) return code;
  const name = typeof uom?.name === "string" ? uom.name.trim() : "";
  return name;
}

/**
 * @typedef {{
 *   value: number;
 *   label: import("react").ReactNode;
 *   searchText: string;
 *   conversion_factor?: unknown;
 *   is_base: boolean;
 *   is_default_sale: boolean;
 *   is_default_purchase: boolean;
 * }} ItemLineUomOption
 */

/**
 * Map item_uoms rows to select options — only that item's UOMs, with base marked.
 *
 * @param {unknown[] | null | undefined} itemUoms
 * @param {(key: string) => string} t
 * @returns {ItemLineUomOption[]}
 */
export function mapItemUomsToLineSelectOptions(itemUoms, t) {
  /** @type {ItemLineUomOption[]} */
  const result = [];
  for (const row of itemUoms ?? []) {
    if (!row || typeof row !== "object") continue;
    const r = /** @type {Record<string, unknown>} */ (row);
    if (r.id == null) continue;
    const uom = /** @type {{ code?: string; name?: string } | null} */ (r.uom);
    const codeLabel = itemLineUomCodeLabel(uom) || `UOM #${r.uom_id ?? r.id}`;
    const isBase = Boolean(r.is_base);
    result.push({
      value: Number(r.id),
      label: isBase ? (
        <span className="inline-flex items-center gap-1.5">
          <span>{codeLabel}</span>
          <Tag color="green" variant="filled" className="!m-0 !px-1.5 !py-0 text-[10px] leading-[16px]">
            {t("lineUomBaseBadge")}
          </Tag>
        </span>
      ) : (
        codeLabel
      ),
      searchText: `${uom?.code ?? ""} ${uom?.name ?? ""} ${isBase ? t("lineUomBaseBadge") : ""}`,
      conversion_factor: r.conversion_factor,
      is_base: isBase,
      is_default_sale: Boolean(r.is_default_sale),
      is_default_purchase: Boolean(r.is_default_purchase),
    });
  }
  return result;
}

/**
 * @param {string} input
 * @param {{ label?: unknown; searchText?: unknown } | undefined} option
 */
export function itemLineUomSelectFilter(input, option) {
  const query = String(input ?? "").trim().toLowerCase();
  if (!query) return true;
  const haystack = `${option?.label ?? ""} ${option?.searchText ?? ""}`.toLowerCase();
  return haystack.includes(query);
}

/**
 * @param {ItemLineUomOption[]} options
 * @param {"base" | "sale" | "purchase"} [prefer]
 */
export function preferredItemLineUomOption(options, prefer = "base") {
  if (!Array.isArray(options) || options.length === 0) return undefined;
  if (prefer === "sale") {
    return options.find((row) => row.is_default_sale) ?? options.find((row) => row.is_base) ?? options[0];
  }
  if (prefer === "purchase") {
    return options.find((row) => row.is_default_purchase) ?? options.find((row) => row.is_base) ?? options[0];
  }
  return options.find((row) => row.is_base) ?? options[0];
}

/**
 * Sentinel / empty values mean “use item base UOM” until real item_uom ids load.
 * @param {unknown} value
 */
export function isItemLineUomSentinel(value) {
  if (value == null || value === "") return true;
  if (typeof value === "string" && value.startsWith("__") && value.endsWith("__")) return true;
  return false;
}
