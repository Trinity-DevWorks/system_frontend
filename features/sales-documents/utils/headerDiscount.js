/*
 * Whole-bill discount form helpers shared by sales invoices, quotations and orders.
 */

/**
 * Header discount fields of a record → form values.
 * @param {Record<string, unknown> | null | undefined} record
 */
export function headerDiscountToForm(record) {
  const type = record?.header_discount_type === "amount" ? "amount" : "percent";
  const value = Number(record?.header_discount_value ?? 0);
  return { header_discount_type: type, header_discount_value: Number.isFinite(value) ? value : 0 };
}

/**
 * Form values → request body (no discount → type null).
 * @param {Record<string, unknown>} values
 */
export function headerDiscountPayload(values) {
  const value = Number(values?.header_discount_value ?? 0);
  if (!Number.isFinite(value) || value <= 0) {
    return { header_discount_type: null, header_discount_value: 0 };
  }
  return { header_discount_type: values?.header_discount_type === "amount" ? "amount" : "percent", header_discount_value: value };
}

/**
 * For the live totals preview.
 * @param {Record<string, unknown> | null | undefined} values
 */
export function headerDiscountPreview(values) {
  return headerDiscountPayload(values ?? {});
}

/**
 * True when the bill discount differs from the loaded record.
 * @param {Record<string, unknown>} values
 * @param {Record<string, unknown>} baseline
 */
export function headerDiscountChanged(values, baseline) {
  const a = headerDiscountPayload(values);
  const b = headerDiscountPayload(baseline);
  return a.header_discount_type !== b.header_discount_type || Number(a.header_discount_value) !== Number(b.header_discount_value);
}
