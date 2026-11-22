/** Fixed length of the symbologies that have one (custom Code 128 has none). */
export const SYMBOLOGY_LENGTH = /** @type {Record<string, number>} */ ({ ean13: 13, upca: 12 });

export const SYMBOLOGIES = ["ean13", "upca", "code128", "gs1_128", "gs1_databar"];
export const GS1_SYMBOLOGIES = ["gs1_128", "gs1_databar"];
export const VALUE_TYPES = ["weight", "price", "count"];

/** @param {string | undefined} symbology */
export const engineFor = (symbology) => (GS1_SYMBOLOGIES.includes(String(symbology)) ? "gs1" : "fixed");

/**
 * Common label layouts. Unit / currency are left for the user (they depend on the company).
 * Positions are 1-based.
 */
export const PRESETS = {
  ean13Weight: {
    symbology: "ean13",
    prefixes: ["21"],
    plu_start: 3,
    plu_length: 5,
    value_start: 8,
    value_length: 5,
    value_type: "weight",
    decimals: 3,
    multiplier: 1,
    price_check_digit_position: null,
  },
  ean13Price: {
    symbology: "ean13",
    prefixes: ["22"],
    plu_start: 3,
    plu_length: 4,
    value_start: 8,
    value_length: 5,
    value_type: "price",
    decimals: 2,
    multiplier: 1,
    price_check_digit_position: 7,
  },
  upcaPrice: {
    symbology: "upca",
    prefixes: ["2"],
    plu_start: 2,
    plu_length: 5,
    value_start: 8,
    value_length: 4,
    value_type: "price",
    decimals: 2,
    multiplier: 1,
    price_check_digit_position: 7,
  },
  gs1Weight: {
    symbology: "gs1_128",
    prefixes: [],
    plu_start: null,
    plu_length: null,
    value_start: null,
    value_length: null,
    value_type: "weight",
    decimals: 0,
    multiplier: 1,
    price_check_digit_position: null,
  },
};

/** @param {Record<string, any>} record */
export function toFormValues(record) {
  return {
    name: record.name ?? "",
    symbology: record.symbology ?? "ean13",
    prefixes: Array.isArray(record.prefixes) ? record.prefixes : ["21"],
    total_length: record.total_length ?? null,
    plu_start: record.plu_start ?? 3,
    plu_length: record.plu_length ?? 5,
    value_start: record.value_start ?? 8,
    value_length: record.value_length ?? 5,
    value_type: record.value_type ?? "weight",
    decimals: record.decimals ?? 3,
    multiplier: record.multiplier != null ? Number(record.multiplier) : 1,
    uom_id: record.uom_id ?? undefined,
    currency_id: record.currency_id ?? undefined,
    price_includes_tax: record.price_includes_tax !== false,
    verify_check_digit: record.verify_check_digit !== false,
    price_check_digit_position: record.price_check_digit_position ?? null,
    priority: record.priority ?? 100,
    is_active: record.is_active !== false,
    branch_ids: Array.isArray(record.branch_ids) ? record.branch_ids : [],
  };
}

/** @param {Record<string, any>} values */
export function toPayload(values) {
  const engine = engineFor(values.symbology);
  const num = (v) => (v === null || v === undefined || v === "" ? null : Number(v));
  return {
    name: String(values.name ?? "").trim(),
    engine,
    symbology: values.symbology,
    prefixes: (Array.isArray(values.prefixes) ? values.prefixes : []).map((p) => String(p).trim()).filter(Boolean),
    total_length: SYMBOLOGY_LENGTH[values.symbology] ?? num(values.total_length),
    plu_start: num(values.plu_start),
    plu_length: num(values.plu_length),
    value_start: engine === "fixed" ? num(values.value_start) : null,
    value_length: engine === "fixed" ? num(values.value_length) : null,
    value_type: values.value_type,
    decimals: engine === "fixed" ? Number(values.decimals ?? 0) : 0,
    multiplier: engine === "fixed" ? Number(values.multiplier || 1) : 1,
    uom_id: values.value_type === "price" ? num(values.uom_id) : num(values.uom_id),
    currency_id: values.value_type === "price" ? num(values.currency_id) : null,
    price_includes_tax: values.price_includes_tax !== false,
    verify_check_digit: values.verify_check_digit !== false,
    price_check_digit_position: engine === "fixed" && values.value_type === "price" ? num(values.price_check_digit_position) : null,
    priority: Number(values.priority ?? 100),
    is_active: values.is_active !== false,
    branch_ids: Array.isArray(values.branch_ids) ? values.branch_ids.map(Number) : [],
  };
}

/**
 * One character per position: what each digit of the label is (for the layout diagram).
 *
 * @param {Record<string, any>} values
 * @returns {{ index: number; role: "prefix" | "plu" | "value" | "priceCheck" | "check" | "other" }[]}
 */
export function layoutCells(values) {
  const length = SYMBOLOGY_LENGTH[values.symbology] ?? Number(values.total_length || 0);
  if (!length || engineFor(values.symbology) !== "fixed") return [];
  const prefixLength = Math.max(0, ...(Array.isArray(values.prefixes) ? values.prefixes : []).map((p) => String(p).length));
  const inRange = (i, start, len) => start != null && len != null && i >= Number(start) && i < Number(start) + Number(len);
  const hasCheck = values.verify_check_digit !== false && SYMBOLOGY_LENGTH[values.symbology] != null;

  return Array.from({ length: Math.min(length, 80) }, (_, k) => {
    const i = k + 1;
    /** @type {"prefix" | "plu" | "value" | "priceCheck" | "check" | "other"} */
    let role = "other";
    if (i <= prefixLength) role = "prefix";
    if (inRange(i, values.plu_start, values.plu_length)) role = "plu";
    if (inRange(i, values.value_start, values.value_length)) role = "value";
    if (values.value_type === "price" && Number(values.price_check_digit_position) === i) role = "priceCheck";
    if (hasCheck && i === length) role = "check";
    return { index: i, role };
  });
}
