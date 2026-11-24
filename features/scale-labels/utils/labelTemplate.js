/** Fields a label can show (backend ScaleLabelTemplate::FIELDS). */
export const LABEL_FIELDS = ["company", "name", "second_name", "unit_price", "value", "total", "packed_date", "use_by", "barcode", "barcode_text", "plu"];

export const DEFAULT_FIELDS = ["company", "name", "unit_price", "value", "total", "packed_date", "use_by", "barcode", "barcode_text"];

/** Common label rolls and A4 sheets. */
export const SIZE_PRESETS = {
  roll60x40: { mode: "single", width_mm: 60, height_mm: 40, font_size: 8 },
  roll58x60: { mode: "single", width_mm: 58, height_mm: 60, font_size: 9 },
  roll80x50: { mode: "single", width_mm: 80, height_mm: 50, font_size: 10 },
  a4x24: { mode: "sheet", width_mm: 64, height_mm: 33.9, sheet_columns: 3, sheet_rows: 8, margin_mm: 8, gap_mm: 2, font_size: 7 },
  a4x21: { mode: "sheet", width_mm: 63.5, height_mm: 38.1, sheet_columns: 3, sheet_rows: 7, margin_mm: 10, gap_mm: 2, font_size: 8 },
};

/** @param {Record<string, any> | null | undefined} record */
export function toFormValues(record) {
  const r = record ?? {};
  return {
    name: r.name ?? "",
    mode: r.mode ?? "single",
    width_mm: r.width_mm != null ? Number(r.width_mm) : 60,
    height_mm: r.height_mm != null ? Number(r.height_mm) : 40,
    sheet_columns: r.sheet_columns ?? 3,
    sheet_rows: r.sheet_rows ?? 8,
    margin_mm: r.margin_mm != null ? Number(r.margin_mm) : 8,
    gap_mm: r.gap_mm != null ? Number(r.gap_mm) : 2,
    fields: Array.isArray(r.fields) ? r.fields : DEFAULT_FIELDS,
    font_size: r.font_size ?? 8,
    scale_barcode_format_id: r.scale_barcode_format_id ?? null,
    is_active: r.is_active ?? true,
  };
}

/** @param {Record<string, any>} values */
export function toPayload(values) {
  return {
    name: values.name ?? "",
    mode: values.mode ?? "single",
    width_mm: values.width_mm,
    height_mm: values.height_mm,
    sheet_columns: values.sheet_columns ?? 3,
    sheet_rows: values.sheet_rows ?? 8,
    margin_mm: values.margin_mm ?? 0,
    gap_mm: values.gap_mm ?? 0,
    fields: values.fields ?? [],
    font_size: values.font_size ?? 8,
    scale_barcode_format_id: values.scale_barcode_format_id ?? null,
    is_active: Boolean(values.is_active),
  };
}
