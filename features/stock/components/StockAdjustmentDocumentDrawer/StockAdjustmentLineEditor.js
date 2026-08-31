"use client";

import LinesGrid from "@/shared/components/lines-grid/LinesGrid";
import ResourceDrawerPanelHeader from "@/shared/components/resource-drawer/ResourceDrawerPanelHeader";
import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import { isPersistedEntityId } from "@/lib/entityId";
import { Select, Typography } from "antd";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import { useMemo } from "react";
import { PO_BASE_UOM } from "../../utils/purchaseOrderDrawerUtils";
import { formatStockQuantity } from "../../utils/formatStockQuantity";
import { usePurchaseOrderLineUomOptions } from "../../queries/usePurchaseOrderDrawerData";
import { useStockBalanceOnHand } from "../../queries/useStockBalanceOnHand";
import InboundLotFields from "../InboundLotFields";

/**
 * @param {{
 *   itemId?: string;
 *   value?: number | string;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   onChange: (value: number | string) => void;
 * }} props
 */
function AdjLineUomField({ itemId, value, readOnly, t, onChange }) {
  const { options, pending } = usePurchaseOrderLineUomOptions({
    itemId,
    t,
    enabled: !readOnly && isPersistedEntityId(itemId),
  });

  return (
    <Select
      showSearch
      optionFilterProp="label"
      className="w-full"
      placeholder={t("poBaseUomOption")}
      value={value ?? PO_BASE_UOM}
      options={options}
      loading={pending}
      disabled={readOnly || itemId == null}
      getPopupContainer={drawerSelectGetPopup}
      onChange={onChange}
    />
  );
}

/**
 * @param {string | null | undefined} direction
 * @param {number | undefined} quantity
 */
function quantityBounds(direction, quantity) {
  if (direction === "increase") return { min: 0.000001, max: undefined };
  if (direction === "decrease") return { min: undefined, max: -0.000001 };
  if (quantity != null && Number(quantity) > 0) return { min: 0.000001, max: undefined };
  if (quantity != null && Number(quantity) < 0) return { min: undefined, max: -0.000001 };
  return { min: undefined, max: undefined };
}

/**
 * @param {{
 *   itemId?: string;
 *   warehouseId?: number;
 *   lotId?: number;
 *   lotNumber?: string;
 *   trackLots?: boolean;
 *   t: (key: string) => string;
 * }} props
 */
function AdjLineOnHandCell({ itemId, warehouseId, lotId, lotNumber, trackLots, t }) {
  const newLot = Boolean(trackLots) && lotId == null && Boolean(String(lotNumber ?? "").trim());
  const { quantity, waitingOnWarehouse, waitingOnLot, pending } = useStockBalanceOnHand({
    itemId,
    warehouseId,
    lotId,
    trackLots,
    newLot,
  });

  let label = "—";
  if (!itemId) {
    label = "—";
  } else if (waitingOnWarehouse) {
    label = t("adjLineOnHandNeedWarehouse");
  } else if (waitingOnLot) {
    label = t("adjLineOnHandNeedLot");
  } else if (pending) {
    label = "…";
  } else if (quantity != null && Number.isFinite(quantity)) {
    label = formatStockQuantity(quantity);
  }

  return (
    <Typography.Text type="secondary" className="block truncate tabular-nums">
      {label}
    </Typography.Text>
  );
}

/**
 * @param {{
 *   lines: import("../../utils/stockAdjustmentDrawerUtils").AdjLineFormRow[];
 *   readOnly: boolean;
 *   warehouseId?: number;
 *   reasonDirection?: string | null;
 *   itemOptions?: { value: string; label: string; track_lots?: boolean }[];
 *   itemsPending?: boolean;
 *   onPatchLine: (index: number, patch: Partial<import("../../utils/stockAdjustmentDrawerUtils").AdjLineFormRow>) => void;
 *   onRemoveLine: (index: number) => void;
 *   onAddLine: () => void;
 *   t: (key: string) => string;
 * }} props
 */
export default function StockAdjustmentLineEditor({
  lines,
  readOnly,
  warehouseId,
  reasonDirection = null,
  itemOptions = [],
  itemsPending = false,
  onPatchLine,
  onRemoveLine,
  onAddLine,
  t,
}) {
  const showLotColumn = lines.some((line) => line.track_lots);

  const columns = useMemo(
    () => [
      { key: "item", label: t("adjLineItem"), width: "minmax(200px, 1fr)" },
      { key: "on_hand", label: t("adjLineOnHand"), width: "110px" },
      { key: "quantity", label: t("adjLineQuantity"), width: "130px" },
      { key: "uom", label: t("adjLineUom"), width: "150px" },
      ...(showLotColumn ? [{ key: "lot", label: t("adjLineLot"), width: "220px" }] : []),
      { key: "unit_cost", label: t("adjLineUnitCost"), width: "130px" },
    ],
    [t, showLotColumn],
  );

  return (
    <section className="item-lines-panel">
      <ResourceDrawerPanelHeader title={t("adjLinesTitle")} description={t("adjLinesDescription")} />

      <LinesGrid
        columns={columns}
        lines={lines}
        canAddLine={!readOnly}
        onAddLine={onAddLine}
        addLabel={t("panelAddRow")}
        deleteAriaLabel={t("panelDeleteConfirm")}
        onRemoveLine={onRemoveLine}
        readOnly={readOnly}
        renderField={(line, index, columnKey) => {
          const row = /** @type {import("../../utils/stockAdjustmentDrawerUtils").AdjLineFormRow} */ (line);
          if (columnKey === "item") {
            return (
              <Select
                showSearch
                optionFilterProp="label"
                className="w-full"
                placeholder={t("adjLineItemPlaceholder")}
                value={row.item_id}
                options={itemOptions}
                loading={itemsPending}
                disabled={readOnly}
                getPopupContainer={drawerSelectGetPopup}
                onChange={(value) => {
                  const selected = itemOptions.find((option) => option.value === value);
                  onPatchLine(index, {
                    item_id: value,
                    item_uom_id: PO_BASE_UOM,
                    track_lots: Boolean(selected?.track_lots),
                    lot_id: undefined,
                    lot_number: "",
                    expiry_date: "",
                  });
                }}
              />
            );
          }
          if (columnKey === "on_hand") {
            return (
              <AdjLineOnHandCell
                itemId={row.item_id}
                warehouseId={warehouseId}
                lotId={row.lot_id}
                lotNumber={row.lot_number}
                trackLots={row.track_lots}
                t={t}
              />
            );
          }
          if (columnKey === "uom") {
            return (
              <AdjLineUomField
                itemId={row.item_id}
                value={row.item_uom_id ?? PO_BASE_UOM}
                readOnly={readOnly}
                t={t}
                onChange={(value) => onPatchLine(index, { item_uom_id: value })}
              />
            );
          }
          if (columnKey === "lot") {
            if (!row.track_lots) return "—";
            const allowNewLot =
              Number(row.quantity) > 0 || (row.quantity == null && reasonDirection === "increase");
            return (
              <InboundLotFields
                itemId={row.item_id}
                warehouseId={warehouseId}
                lotId={row.lot_id}
                lotNumber={row.lot_number}
                expiryDate={row.expiry_date}
                readOnly={readOnly}
                allowNewLot={allowNewLot}
                t={t}
                lotPlaceholder={t("adjLineLotPlaceholder")}
                lotNumberPlaceholder={t("adjLineLotNumberPlaceholder")}
                onPatch={(patch) => onPatchLine(index, patch)}
              />
            );
          }
          if (columnKey === "unit_cost") {
            return (
              <TenantNumberInput
                kind="money"
                className="w-full"
                min={0}
                value={row.unit_cost}
                disabled={readOnly}
                onChange={(value) => onPatchLine(index, { unit_cost: value ?? undefined })}
              />
            );
          }
          const bounds = quantityBounds(reasonDirection, row.quantity);
          return (
            <TenantNumberInput
              kind="quantity"
              className="w-full"
              min={bounds.min}
              max={bounds.max}
              value={row.quantity}
              disabled={readOnly}
              onChange={(value) => onPatchLine(index, { quantity: value ?? undefined })}
            />
          );
        }}
      />
    </section>
  );
}
