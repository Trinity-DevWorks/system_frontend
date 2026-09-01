/**
 * Prefill a purchase-invoice create drawer from a posted goods receipt's remaining qty.
 */

import dayjs from "dayjs";
import { formatItemOptionLabel } from "@/features/items/utils/formatItemLabel";
import { buildResourceDrawerHref, DRAWER_FROM_GR_PARAM } from "@/lib/drawer/drawerUrl";
import { normalizeEntityId } from "@/lib/entityId";
import { getPurchaseInvoiceDefaults, PI_BASE_UOM } from "./purchaseInvoiceDrawerUtils";

/**
 * @param {string | number | null | undefined} receiptId
 * @returns {{
 *   featureId: "purchaseInvoices",
 *   mode: "create",
 *   extras: { fromGoodsReceiptId: string },
 * } | null}
 */
export function purchaseInvoiceFromGrDrawerArgs(receiptId) {
  const id = normalizeEntityId(receiptId);
  if (id == null) return null;
  return {
    featureId: "purchaseInvoices",
    mode: "create",
    extras: { fromGoodsReceiptId: String(id) },
  };
}

/**
 * Remaining qty comes from posted GR detail lines. List rows omit `lines`.
 *
 * @param {unknown} receipt
 * @returns {boolean | null} true if any line can still be invoiced, false if none remain,
 *   null when the payload does not include lines (or the remaining-qty field)
 */
export function goodsReceiptHasOpenToInvoice(receipt) {
  if (!receipt || typeof receipt !== "object") return null;
  const rawLines = /** @type {{ lines?: unknown }} */ (receipt).lines;
  if (!Array.isArray(rawLines)) return null;
  if (rawLines.length === 0) return false;

  let sawRemainingField = false;
  for (const line of rawLines) {
    if (!line || typeof line !== "object") continue;
    if (!("open_to_invoice_quantity" in line)) continue;
    sawRemainingField = true;
    const open = Number(/** @type {{ open_to_invoice_quantity?: unknown }} */ (line).open_to_invoice_quantity);
    if (Number.isFinite(open) && open > 0) return true;
  }

  if (!sawRemainingField) return null;
  return false;
}

/**
 * Prefer the list/detail `can_invoice` flag; fall back to line remaining qty.
 *
 * @param {unknown} receipt
 * @returns {boolean | null}
 */
export function goodsReceiptCanCreateInvoice(receipt) {
  if (!receipt || typeof receipt !== "object") return null;
  if ("can_invoice" in receipt) {
    return Boolean(/** @type {{ can_invoice?: unknown }} */ (receipt).can_invoice);
  }
  return goodsReceiptHasOpenToInvoice(receipt);
}

export const PI_GR_NO_OPEN_QTY_MESSAGE_KEY = "purchase-invoice-gr-no-open-qty";

/**
 * Opens the PI create drawer unless this GR has no remaining qty.
 *
 * @param {{
 *   receipt?: Record<string, unknown> | null;
 *   receiptId?: string | number | null;
 *   openDrawer: (args: {
 *     featureId: "purchaseInvoices";
 *     mode: "create";
 *     extras: { fromGoodsReceiptId: string };
 *   }) => void;
 *   message: { warning: (content: string | { content: string; key?: string }) => void };
 *   t: (key: string) => string;
 * }} args
 * @returns {boolean} true when the create drawer was opened
 */
export function tryOpenPurchaseInvoiceFromGoodsReceipt({
  receipt = null,
  receiptId = null,
  openDrawer,
  message,
  t,
}) {
  if (goodsReceiptCanCreateInvoice(receipt) === false) {
    message.warning({ content: t("grNoOpenQty"), key: PI_GR_NO_OPEN_QTY_MESSAGE_KEY });
    return false;
  }
  const args = purchaseInvoiceFromGrDrawerArgs(receipt?.id ?? receiptId);
  if (!args) return false;
  openDrawer(args);
  return true;
}

/**
 * @param {string} receiptId
 */
export function buildCreateInvoiceFromGrHref(receiptId) {
  return `${buildResourceDrawerHref("/main/purchase-invoices", null, "create")}&${DRAWER_FROM_GR_PARAM}=${encodeURIComponent(String(receiptId))}`;
}

/**
 * @param {Record<string, unknown>} receipt
 * @param {{ currencyId?: number | null }} [opts]
 * @returns {{
 *   header: Record<string, unknown>;
 *   lines: import("./purchaseInvoiceDrawerUtils").PiLineFormRow[];
 *   goodsReceiptNumber: string | null;
 *   supplierName: string | null;
 * } | null}
 */
export function mapGoodsReceiptToPiCreateSeed(receipt, opts = {}) {
  if (!receipt || typeof receipt !== "object") return null;
  const receiptId = normalizeEntityId(receipt.id);
  if (receiptId == null) return null;

  /** @type {import("./purchaseInvoiceDrawerUtils").PiLineFormRow[]} */
  const lines = [];
  const rawLines = Array.isArray(receipt.lines) ? receipt.lines : [];

  for (const line of rawLines) {
    if (!line || typeof line !== "object") continue;
    const open = Number(line.open_to_invoice_quantity ?? line.quantity ?? 0);
    if (!Number.isFinite(open) || open <= 0) continue;

    const item = line.item && typeof line.item === "object" ? line.item : null;
    const itemUom = line.item_uom && typeof line.item_uom === "object" ? line.item_uom : null;
    const uom = itemUom?.uom && typeof itemUom.uom === "object" ? itemUom.uom : null;

    lines.push({
      item_id: normalizeEntityId(line.item_id) ?? undefined,
      item_label: formatItemOptionLabel(
        item && typeof item === "object"
          ? /** @type {{ item_code?: unknown; name?: unknown; id?: unknown }} */ (item)
          : { id: line.item_id },
      ),
      quantity: open,
      item_uom_id: line.item_uom_id != null ? Number(line.item_uom_id) : PI_BASE_UOM,
      item_uom_label:
        typeof uom?.code === "string" ? uom.code : typeof uom?.name === "string" ? uom.name : "",
      unit_price: line.unit_cost != null ? Number(line.unit_cost) : undefined,
      goods_receipt_line_id: line.id != null ? Number(line.id) : undefined,
      purchase_order_line_id:
        line.purchase_order_line_id != null ? Number(line.purchase_order_line_id) : undefined,
      notes: "",
    });
  }

  if (lines.length === 0) return null;

  const supplierId =
    normalizeEntityId(receipt.supplier_id) ??
    normalizeEntityId(
      receipt.supplier && typeof receipt.supplier === "object"
        ? /** @type {{ id?: unknown }} */ (receipt.supplier).id
        : null,
    ) ??
    normalizeEntityId(
      receipt.purchase_order && typeof receipt.purchase_order === "object"
        ? /** @type {{ supplier?: { id?: unknown } }} */ (receipt.purchase_order).supplier?.id
        : null,
    );

  return {
    header: {
      ...getPurchaseInvoiceDefaults(),
      supplier_id: supplierId ?? undefined,
      currency_id: opts.currencyId != null ? Number(opts.currencyId) : undefined,
      goods_receipt_id: receiptId,
      invoice_date: dayjs(),
    },
    lines,
    goodsReceiptNumber: typeof receipt.grn_number === "string" ? receipt.grn_number : null,
    supplierName:
      typeof receipt.supplier?.name === "string"
        ? receipt.supplier.name
        : typeof receipt.purchase_order?.supplier?.name === "string"
          ? receipt.purchase_order.supplier.name
          : null,
  };
}
