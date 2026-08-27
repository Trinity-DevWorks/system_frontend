/**
 * Map purchasing alert rows to purchase order drawer create seeds.
 */

import dayjs from "dayjs";
import { PO_BASE_UOM, getPurchaseOrderDefaults } from "./purchaseOrderDrawerUtils";
import { parseLeadTimeDays, suggestedExpectedDate } from "./purchaseOrderExpectedDate";

/**
 * @param {Record<string, unknown>[]} alerts
 * @param {import("dayjs").Dayjs} orderDate
 */
function expectedDateFromAlerts(alerts, orderDate) {
  /** @type {number | undefined} */
  let maxDays;
  for (const alert of alerts) {
    const days = parseLeadTimeDays(alert?.lead_time_days);
    if (days == null) continue;
    maxDays = maxDays == null ? days : Math.max(maxDays, days);
  }
  return suggestedExpectedDate(orderDate, maxDays);
}

/**
 * @param {Record<string, unknown>} alert
 * @returns {Record<string, unknown> | null}
 */
function buildPurchaseOrderLineFromAlert(alert) {
  if (!alert || typeof alert !== "object") return null;

  const quantity = Number(alert.suggested_order_qty);
  if (!Number.isFinite(quantity) || quantity <= 0) return null;

  /** @type {Record<string, unknown>} */
  const line = {
    item_id: alert.item_id,
    quantity,
    item_uom_id: PO_BASE_UOM,
    notes: "",
  };

  const unitPrice = alert.preferred_supplier?.last_purchase_price;
  line.unitPriceAuto = true;
  if (unitPrice != null && Number(unitPrice) >= 0) {
    line.unit_price = Number(unitPrice);
  }

  return line;
}

/**
 * @param {Record<string, unknown>} alert
 * @returns {{ header: Record<string, unknown>; lines: Array<Record<string, unknown>> } | null}
 */
export function buildPurchaseOrderCreateSeedFromAlert(alert) {
  const line = buildPurchaseOrderLineFromAlert(alert);
  if (!line) return null;

  const supplierId = alert.preferred_supplier?.id;
  const warehouseId = alert.warehouse_id;

  /** @type {Record<string, unknown>} */
  const header = {
    ...getPurchaseOrderDefaults(),
    order_date: dayjs(),
  };

  if (supplierId != null) {
    header.supplier_id = supplierId;
  }
  if (warehouseId != null) {
    header.warehouse_id = warehouseId;
  }

  const expectedDate = expectedDateFromAlerts([alert], header.order_date);
  if (expectedDate) {
    header.expected_date = expectedDate;
  }

  return { header, lines: [line] };
}

/**
 * @param {Record<string, unknown>} alert
 */
function getAlertGroupKey(alert) {
  const supplierId = alert.preferred_supplier?.id ?? "";
  const warehouseId = alert.warehouse_id ?? "";
  return `${supplierId}|${warehouseId}`;
}

/**
 * @param {Array<Record<string, unknown>>} lines
 * @returns {Array<Record<string, unknown>>}
 */
function mergePurchaseOrderLines(lines) {
  /** @type {Map<string, Record<string, unknown>>} */
  const merged = new Map();

  for (const line of lines) {
    const itemId = String(line.item_id);
    const existing = merged.get(itemId);
    if (!existing) {
      merged.set(itemId, { ...line });
      continue;
    }
    existing.quantity = Number(existing.quantity) + Number(line.quantity);
  }

  return Array.from(merged.values());
}

/**
 * Group alerts by supplier + warehouse and build one drawer seed per group.
 *
 * @param {Array<Record<string, unknown>>} alerts
 * @returns {{
 *   seeds: Array<{ header: Record<string, unknown>; lines: Array<Record<string, unknown>> }>;
 *   skippedCount: number;
 * }}
 */
export function groupAlertsIntoPurchaseOrderSeeds(alerts) {
  /** @type {Map<string, { alert: Record<string, unknown>; line: Record<string, unknown> }[]>} */
  const groups = new Map();
  let skippedCount = 0;

  for (const alert of alerts) {
    const line = buildPurchaseOrderLineFromAlert(alert);
    if (!line) {
      skippedCount += 1;
      continue;
    }

    const key = getAlertGroupKey(alert);
    const bucket = groups.get(key) ?? [];
    bucket.push({ alert, line });
    groups.set(key, bucket);
  }

  const seeds = [];

  for (const rows of groups.values()) {
    const first = rows[0]?.alert;
    if (!first) continue;

    /** @type {Record<string, unknown>} */
    const header = {
      ...getPurchaseOrderDefaults(),
      order_date: dayjs(),
    };

    const supplierId = first.preferred_supplier?.id;
    if (supplierId != null) {
      header.supplier_id = supplierId;
    }
    if (first.warehouse_id != null) {
      header.warehouse_id = first.warehouse_id;
    }

    const expectedDate = expectedDateFromAlerts(
      rows.map((row) => row.alert),
      header.order_date,
    );
    if (expectedDate) {
      header.expected_date = expectedDate;
    }

    seeds.push({
      header,
      lines: mergePurchaseOrderLines(rows.map((row) => row.line)),
    });
  }

  return { seeds, skippedCount };
}
