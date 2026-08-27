/**
 * Prefill a goods-receipt create drawer from a purchase order's remaining qty.
 */

import dayjs from "dayjs";
import { formatItemOptionLabel } from "@/features/items/utils/formatItemLabel";
import { buildResourceDrawerHref } from "@/lib/drawer/useResourceDrawerUrl";
import { normalizeEntityId } from "@/lib/entityId";
import { PO_BASE_UOM } from "./purchaseOrderDrawerUtils";
import { getGoodsReceiptDefaults } from "./goodsReceiptDrawerUtils";

export const GRN_FROM_PO_PARAM = "from_po";

/**
 * @param {string} orderId
 */
export function buildReceiveGoodsHref(orderId) {
  return `${buildResourceDrawerHref("/main/stock/goods-receipts", null, "create")}&${GRN_FROM_PO_PARAM}=${encodeURIComponent(String(orderId))}`;
}

/**
 * @param {Record<string, unknown>} order
 * @returns {{
 *   header: Record<string, unknown>;
 *   lines: import("./goodsReceiptDrawerUtils").GrnLineFormRow[];
 *   warehouseName: string | null;
 *   supplierName: string | null;
 *   purchaseOrderNumber: string | null;
 * } | null}
 */
export function mapPurchaseOrderToGrnCreateSeed(order) {
  if (!order || typeof order !== "object") return null;
  const orderId = normalizeEntityId(order.id);
  if (orderId == null) return null;

  /** @type {import("./goodsReceiptDrawerUtils").GrnLineFormRow[]} */
  const lines = [];
  const rawLines = Array.isArray(order.lines) ? order.lines : [];

  for (const line of rawLines) {
    if (!line || typeof line !== "object") continue;
    const open = Number(line.open_quantity ?? 0);
    if (!Number.isFinite(open) || open <= 0) continue;

    const item = line.item && typeof line.item === "object" ? line.item : null;
    const itemUom = line.item_uom && typeof line.item_uom === "object" ? line.item_uom : null;
    const uom = itemUom?.uom && typeof itemUom.uom === "object" ? itemUom.uom : null;

    lines.push({
      purchase_order_line_id: line.id != null ? Number(line.id) : undefined,
      item_id: normalizeEntityId(line.item_id) ?? undefined,
      item_label: formatItemOptionLabel(
        item && typeof item === "object"
          ? /** @type {{ item_code?: unknown; name?: unknown; id?: unknown }} */ (item)
          : { id: line.item_id },
      ),
      quantity: open,
      item_uom_id: line.item_uom_id != null ? Number(line.item_uom_id) : PO_BASE_UOM,
      unit_cost: line.unit_price != null ? Number(line.unit_price) : undefined,
      lot_id: undefined,
      lot_number: "",
      expiry_date: "",
      track_lots: Boolean(item?.track_lots),
      open_quantity: open,
      item_uom_label:
        typeof uom?.code === "string" ? uom.code : typeof uom?.name === "string" ? uom.name : "",
      notes: "",
    });
  }

  if (lines.length === 0) return null;

  return {
    header: {
      ...getGoodsReceiptDefaults(),
      purchase_order_id: orderId,
      warehouse_id: order.warehouse_id != null ? Number(order.warehouse_id) : undefined,
      supplier_id: order.supplier_id ?? undefined,
      received_date: dayjs(),
    },
    lines,
    warehouseName: typeof order.warehouse?.name === "string" ? order.warehouse.name : null,
    supplierName: typeof order.supplier?.name === "string" ? order.supplier.name : null,
    purchaseOrderNumber: typeof order.po_number === "string" ? order.po_number : null,
  };
}
