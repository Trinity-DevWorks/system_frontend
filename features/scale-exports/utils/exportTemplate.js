/** Values a column of the scale file can hold (backend ScaleExportService::FIELDS). */
export const EXPORT_FIELDS = [
  "plu",
  "plu_padded",
  "item_code",
  "name",
  "second_name",
  "barcode",
  "unit_code",
  "price_type",
  "price",
  "shelf_life_days",
  "category",
  "vat_rate",
  "constant",
];

export const DELIMITERS = [",", ";", "tab", "|", "fixed"];
export const ENCODINGS = ["utf8", "utf8_bom", "windows1256"];
export const EXTENSIONS = ["csv", "txt", "xlsx"];
export const QUOTES = ["needed", "always", "never"];
export const LINE_ENDINGS = ["crlf", "lf"];

const BASE_COLUMNS = [
  { field: "plu", header: "PLU" },
  { field: "name", header: "Name" },
  { field: "price", header: "Price" },
  { field: "price_type", header: "Type" },
  { field: "shelf_life_days", header: "ShelfLife" },
  { field: "barcode", header: "Barcode" },
];

/** Starting points; brand presets can be added here later without code elsewhere. */
export const PRESETS = {
  genericCsv: { file_extension: "csv", delimiter: ",", encoding: "utf8", quote: "needed", line_ending: "crlf", has_header: true, columns: BASE_COLUMNS },
  excelBom: { file_extension: "csv", delimiter: ";", encoding: "utf8_bom", quote: "needed", line_ending: "crlf", has_header: true, columns: BASE_COLUMNS },
  arabicLegacy: { file_extension: "txt", delimiter: "tab", encoding: "windows1256", quote: "never", line_ending: "crlf", has_header: false, columns: BASE_COLUMNS },
  xlsx: { file_extension: "xlsx", delimiter: ",", encoding: "utf8", quote: "needed", line_ending: "crlf", has_header: true, columns: BASE_COLUMNS },
};

/** @param {Record<string, any> | null | undefined} record */
export function toFormValues(record) {
  const r = record ?? {};
  return {
    name: r.name ?? "",
    branch_id: r.branch_id ?? null,
    price_source: r.price_source ?? "item_price",
    price_list_id: r.price_list_id ?? null,
    category_ids: Array.isArray(r.category_ids) ? r.category_ids : [],
    file_extension: r.file_extension ?? "csv",
    delimiter: r.delimiter ?? ",",
    has_header: r.has_header ?? true,
    encoding: r.encoding ?? "utf8",
    line_ending: r.line_ending ?? "crlf",
    quote: r.quote ?? "needed",
    decimal_separator: r.decimal_separator ?? ".",
    price_decimals: r.price_decimals ?? 2,
    price_multiplier: r.price_multiplier != null ? Number(r.price_multiplier) : 1,
    is_active: r.is_active ?? true,
    columns: Array.isArray(r.columns) && r.columns.length
      ? r.columns.map((c) => ({ ...c, map_weight: c.map?.weight ?? "", map_piece: c.map?.piece ?? "" }))
      : BASE_COLUMNS.map((c) => ({ ...c })),
  };
}

/** @param {Record<string, any>} values */
export function toPayload(values) {
  const columns = (values.columns ?? [])
    .filter((c) => c && c.field)
    .map((c) => {
      const column = { field: c.field, header: c.header ?? "" };
      if (c.width) column.width = Number(c.width);
      if (c.pad_char) column.pad_char = c.pad_char;
      if (c.pad_side) column.pad_side = c.pad_side;
      if (c.field === "constant") column.constant = c.constant ?? "";
      if (c.field === "price_type" && (c.map_weight || c.map_piece)) column.map = { weight: c.map_weight || null, piece: c.map_piece || null };
      return column;
    });
  return {
    name: values.name ?? "",
    branch_id: values.branch_id ?? null,
    price_source: values.price_source ?? "item_price",
    price_list_id: values.price_source === "price_list" ? (values.price_list_id ?? null) : null,
    category_ids: values.category_ids ?? [],
    file_extension: values.file_extension,
    delimiter: values.delimiter,
    has_header: Boolean(values.has_header),
    encoding: values.encoding,
    line_ending: values.line_ending,
    quote: values.quote,
    decimal_separator: values.decimal_separator,
    price_decimals: values.price_decimals ?? 2,
    price_multiplier: values.price_multiplier ?? 1,
    is_active: Boolean(values.is_active),
    columns,
  };
}
