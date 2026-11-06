/*
 * Opening invoices / opening credits of a customer or supplier (old open balances), as form rows.
 * Positive amount = opening invoice, negative amount = opening credit.
 */

import dayjs from "dayjs";
import { tenantMoneyFixed } from "@/lib/tenant-format";

/** @param {unknown} value */
function dateKey(value) {
  if (value == null || value === "") return "";
  const parsed = dayjs(/** @type {string} */ (value));
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : String(value).slice(0, 10);
}

/**
 * API rows (from the customer/supplier detail) → form rows.
 * @param {unknown} rows
 */
export function mapOpeningDocumentsToForm(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((raw) => {
    const r = /** @type {Record<string, unknown>} */ (raw && typeof raw === "object" ? raw : {});
    return {
      id: r.id ?? null,
      number: r.number ?? null,
      kind: r.kind ?? null,
      locked: r.locked === true,
      used_amount: Number(r.used_amount ?? 0),
      currency_id: r.currency_id ?? undefined,
      original_number: r.original_number ?? "",
      document_date: r.document_date ? dayjs(String(r.document_date)) : dayjs(),
      due_on: r.due_on ? dayjs(String(r.due_on)) : null,
      amount: Number(r.amount ?? 0),
    };
  });
}

/**
 * Compares what the user can change (for the unsaved-changes check).
 * Works on form rows and on API rows.
 * @param {unknown} rows
 */
export function openingDocumentsFingerprint(rows) {
  if (!Array.isArray(rows)) return "";
  return JSON.stringify(
    rows.map((raw) => {
      const r = /** @type {Record<string, unknown>} */ (raw && typeof raw === "object" ? raw : {});
      return [
        r.id ?? null,
        r.currency_id == null || r.currency_id === "" ? null : Number(r.currency_id),
        String(r.original_number ?? "").trim(),
        dateKey(r.document_date),
        dateKey(r.due_on),
        tenantMoneyFixed(Number(r.amount ?? 0)),
      ];
    }),
  );
}

/**
 * Form rows → `opening_documents` request body.
 * @param {unknown} rows
 */
export function openingDocumentsToPayload(rows) {
  if (!Array.isArray(rows)) return [];
  /** @type {Record<string, unknown>[]} */
  const out = [];
  for (const raw of rows) {
    const r = /** @type {Record<string, unknown>} */ (raw && typeof raw === "object" ? raw : {});
    const amount = Number(r.amount ?? 0);
    if (r.currency_id == null || r.currency_id === "" || !Number.isFinite(amount) || amount === 0) continue;
    const original = String(r.original_number ?? "").trim();
    const due = dateKey(r.due_on);
    /** @type {Record<string, unknown>} */
    const row = {
      currency_id: Number(r.currency_id),
      original_number: original === "" ? null : original.slice(0, 64),
      document_date: dateKey(r.document_date) || dayjs().format("YYYY-MM-DD"),
      due_on: due === "" ? null : due,
      amount,
    };
    if (r.id != null && r.id !== "") row.id = String(r.id);
    out.push(row);
  }
  return out;
}

/**
 * Sum of the rows per currency id.
 * @param {unknown} rows
 * @returns {Map<number, number>}
 */
export function openingTotalsByCurrency(rows) {
  const totals = new Map();
  if (!Array.isArray(rows)) return totals;
  for (const raw of rows) {
    const r = /** @type {Record<string, unknown>} */ (raw && typeof raw === "object" ? raw : {});
    const amount = Number(r.amount ?? 0);
    if (r.currency_id == null || r.currency_id === "" || !Number.isFinite(amount)) continue;
    const id = Number(r.currency_id);
    totals.set(id, (totals.get(id) ?? 0) + amount);
  }
  return totals;
}
