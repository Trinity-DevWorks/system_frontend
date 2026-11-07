/*
 * Plain helper functions for the landed cost drawer (no React).
 */

import dayjs from "dayjs";
import { formatTenantNumber } from "@/lib/tenant-format";
import { getTenantFormatSettings } from "@/lib/tenant-format-runtime";

/** How a charge is split over the receipt lines. */
export const LANDED_COST_METHODS = ["value", "quantity", "weight", "volume", "manual"];

/**
 * @typedef {{ source_type: string; source_id: string; number?: string | null; date?: string | null; supplier?: string | null }} LandedCostReceipt
 * @typedef {{
 *   source_type: string;
 *   source_line_id: number;
 *   amount: number | null;
 *   method: string;
 *   description?: string | null;
 *   manual: Record<string, number>;
 *   document_number?: string | null;
 *   party?: string | null;
 *   open_amount?: string;
 * }} LandedCostCharge
 */

/** Landed costs are in the primary currency, so amounts carry its symbol. @param {unknown} value */
export function landedCostMoney(value) {
  const money = formatTenantNumber(value ?? 0, { decimals: 2 });
  const symbol = String(getTenantFormatSettings().primaryCurrencySymbol ?? "").trim();
  return symbol ? `${money} ${symbol}` : money;
}

/** Header form defaults for a new landed cost. */
export function getLandedCostDefaults() {
  return { cost_date: dayjs(), reference: "", notes: "" };
}

/** @param {Record<string, any>} record */
export function mapLandedCostRecordToForm(record) {
  return {
    cost_date: record?.cost_date ? dayjs(record.cost_date) : dayjs(),
    reference: record?.reference ?? "",
    notes: record?.notes ?? "",
  };
}

/**
 * Receipts of a saved landed cost.
 * @param {Record<string, any>} record
 * @returns {LandedCostReceipt[]}
 */
export function mapLandedCostReceipts(record) {
  return (record?.receipts ?? []).map((r) => ({ ...r }));
}

/**
 * Charges of a saved landed cost, in editor shape.
 * @param {Record<string, any>} record
 * @returns {LandedCostCharge[]}
 */
export function mapLandedCostCharges(record) {
  return (record?.charges ?? []).map((c) => ({
    source_type: c.source_type,
    source_line_id: Number(c.source_line_id),
    amount: Number(c.amount),
    method: c.method,
    description: c.description,
    manual:
      c.method === "manual"
        ? Object.fromEntries(Object.entries(c.allocations ?? {}).map(([k, a]) => [k, Number(a.amount)]))
        : {},
    document_number: c.document_number,
    party: c.party,
    open_amount: c.open_amount,
  }));
}

/**
 * A charge picked from the open charges list.
 * @param {Record<string, any>} row
 * @returns {LandedCostCharge}
 */
export function chargeFromSource(row) {
  return {
    source_type: row.source_type,
    source_line_id: Number(row.source_line_id),
    amount: Number(row.open_amount),
    // Freight on a purchase invoice usually follows weight; other charges follow value.
    method: row.source_type === "purchase_invoice_line" ? "weight" : "value",
    description: row.label ?? null,
    manual: {},
    document_number: row.document_number,
    party: row.party,
    open_amount: row.open_amount,
  };
}

/** @param {{ source_type: string; source_id: string }} r */
export function receiptKey(r) {
  return `${r.source_type}:${r.source_id}`;
}

/** @param {{ source_type: string; source_line_id: number | string }} c */
export function chargeKey(c) {
  return `${c.source_type}:${Number(c.source_line_id)}`;
}

/**
 * Receipts + charges part of the request body (also the preview body).
 * @param {LandedCostReceipt[]} receipts
 * @param {LandedCostCharge[]} charges
 */
export function landedCostLinesPayload(receipts, charges) {
  return {
    receipts: receipts.map((r) => ({ source_type: r.source_type, source_id: r.source_id })),
    charges: charges.map((c) => ({
      source_type: c.source_type,
      source_line_id: c.source_line_id,
      amount: c.amount,
      method: c.method,
      description: c.description || null,
      manual: c.method === "manual" ? c.manual : {},
    })),
  };
}

/**
 * Full save body.
 * @param {Record<string, any>} values header form values
 * @param {LandedCostReceipt[]} receipts
 * @param {LandedCostCharge[]} charges
 */
export function landedCostPayload(values, receipts, charges) {
  return {
    cost_date: values?.cost_date ? dayjs(values.cost_date).format("YYYY-MM-DD") : null,
    reference: values?.reference || null,
    notes: values?.notes || null,
    ...landedCostLinesPayload(receipts, charges),
  };
}

/**
 * True when the header differs from its baseline.
 * @param {import("antd").FormInstance} form
 * @param {Record<string, any>} baseline
 */
export function isLandedCostHeaderDirty(form, baseline) {
  const v = form.getFieldsValue(true);
  const date = (d) => (d ? dayjs(d).format("YYYY-MM-DD") : "");
  return (
    date(v.cost_date) !== date(baseline.cost_date) ||
    String(v.reference ?? "").trim() !== String(baseline.reference ?? "").trim() ||
    String(v.notes ?? "").trim() !== String(baseline.notes ?? "").trim()
  );
}

/**
 * True when receipts or charges differ from their baseline.
 * @param {{ receipts: LandedCostReceipt[]; charges: LandedCostCharge[] }} current
 * @param {{ receipts: LandedCostReceipt[]; charges: LandedCostCharge[] }} baseline
 */
export function areLandedCostLinesDirty(current, baseline) {
  return JSON.stringify(landedCostLinesPayload(current.receipts, current.charges)) !== JSON.stringify(landedCostLinesPayload(baseline.receipts, baseline.charges));
}

/**
 * @param {(key: string) => string} t
 * @param {string | null | undefined} status
 */
export function getLandedCostStatusLabel(t, status) {
  if (status === "draft" || status === "posted" || status === "reversed") return t(`status_${status}`);
  return status ? String(status) : "—";
}

/** @param {string | null | undefined} status */
export function landedCostStatusColor(status) {
  if (status === "posted") return "green";
  if (status === "reversed") return "warning";
  return "default";
}
