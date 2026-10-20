"use client";

import LinesGrid from "@/shared/components/lines-grid/LinesGrid";
import ResourceDrawerPanelHeader from "@/shared/components/resource-drawer/ResourceDrawerPanelHeader";
import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import { Select, Typography } from "antd";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import { useMemo } from "react";
import { STOCK_TRANSFER_BASE_UOM } from "../../utils/stockTransferDrawerUtils";
import { formatStockQuantity } from "../../utils/formatStockQuantity";
import { isPersistedEntityId } from "@/lib/entityId";
import StockLotSelect from "../StockLotSelect";
import StockLineUomField from "../StockLineUomField";
import { useTransferLineLotOptions } from "../../queries/useStockTransferDrawerData";
import { useStockBalanceOnHand } from "../../queries/useStockBalanceOnHand";

/**
 * @param {{
 *   itemId?: string;
 *   warehouseId?: number;
 *   value?: number;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   onChange: (value?: number) => void;
 * }} props
 */
function TransferLineLotField({ itemId, warehouseId, value, readOnly, t, onChange }) {
  const { options, pending } = useTransferLineLotOptions({
    itemId,
    warehouseId,
    enabled: !readOnly && isPersistedEntityId(itemId) && warehouseId != null,
    t,
  });

  return (
    <StockLotSelect
      placeholder={t("transferLineLotPlaceholder")}
      value={value}
      options={options}
      loading={pending}
      disabled={readOnly || itemId == null || warehouseId == null}
      onChange={onChange}
    />
  );
}

/**
 * @param {{
 *   itemId?: string;
 *   warehouseId?: number;
 *   lotId?: number;
 *   trackLots?: boolean;
 *   t: (key: string) => string;
 * }} props
 */
function TransferLineOnHandCell({ itemId, warehouseId, lotId, trackLots, t }) {
  const { quantity, waitingOnWarehouse, waitingOnLot, pending } = useStockBalanceOnHand({
    itemId,
    warehouseId,
    lotId,
    trackLots,
  });

  let label = "—";
  if (!itemId) {
    label = "—";
  } else if (waitingOnWarehouse) {
    label = t("transferLineOnHandNeedWarehouse");
  } else if (waitingOnLot) {
    label = t("transferLineOnHandNeedLot");
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
 *   lines: import("../../utils/stockTransferDrawerUtils").TransferLineFormRow[];
 *   readOnly: boolean;
 *   itemOptions: { value: number | string; label: string }[];
 *   stockableItems: Array<{ id?: unknown; track_lots?: boolean }>;
 *   fromWarehouseId?: number;
 *   itemsPending: boolean;
 *   canAddLine: boolean;
 *   onPatchLine: (index: number, patch: Partial<import("../../utils/stockTransferDrawerUtils").TransferLineFormRow>) => void;
 *   onRemoveLine: (index: number) => void;
 *   onAddLine: () => void;
 *   t: (key: string) => string;
 * }} props
 */
export default function StockTransferLineEditor({
  lines,
  readOnly,
  itemOptions,
  stockableItems,
  fromWarehouseId,
  itemsPending,
  canAddLine,
  onPatchLine,
  onRemoveLine,
  onAddLine,
  t,
}) {
  const showLotColumn = useMemo(
    () =>
      stockableItems.some((item) => item?.track_lots === true) ||
      lines.some((line) => line.track_lots || line.lot_id != null),
    [stockableItems, lines],
  );

  const showProgressColumns = useMemo(
    () => readOnly && lines.some((line) => line.open_quantity != null || line.received_quantity != null),
    [readOnly, lines],
  );

  const columns = useMemo(
    () => [
      { key: "item", label: t("transferLineItem"), width: "minmax(240px, 1fr)" },
      ...(showLotColumn ? [{ key: "lot", label: t("transferLineLot"), width: "220px" }] : []),
      ...(!readOnly ? [{ key: "on_hand", label: t("transferLineOnHand"), width: "110px" }] : []),
      { key: "quantity", label: t("transferLineQuantity"), width: "120px" },
      ...(showProgressColumns
        ? [
            { key: "received", label: t("transferLineReceived"), width: "100px" },
            { key: "open", label: t("transferLineOpen"), width: "100px" },
          ]
        : []),
      { key: "uom", label: t("transferLineUom"), width: "160px" },
    ],
    [t, showLotColumn, showProgressColumns, readOnly],
  );

  return (
    <section className="item-lines-panel">
      <ResourceDrawerPanelHeader
        title={t("transferLinesTitle")}
        description={t("transferLinesDescription")}
      />

      <LinesGrid
        columns={columns}
        lines={lines}
        canAddLine={!readOnly && canAddLine}
        onAddLine={onAddLine}
        addLabel={t("panelAddRow")}
        deleteAriaLabel={t("panelDeleteConfirm")}
        onRemoveLine={onRemoveLine}
        readOnly={readOnly}
        renderField={(line, index, columnKey) => {
          const row = /** @type {import("../../utils/stockTransferDrawerUtils").TransferLineFormRow} */ (line);
          if (columnKey === "item") {
            return (
              <Select
                showSearch
                optionFilterProp="label"
                className="w-full"
                placeholder={t("transferLineItemPlaceholder")}
                value={row.item_id}
                options={itemOptions}
                loading={itemsPending}
                disabled={readOnly}
                getPopupContainer={drawerSelectGetPopup}
                onChange={(value) => {
                  const item = stockableItems.find((candidate) => candidate.id === value);
                  onPatchLine(index, {
                    item_id: value,
                    item_uom_id: STOCK_TRANSFER_BASE_UOM,
                    lot_id: undefined,
                    track_lots: Boolean(item?.track_lots),
                  });
                }}
              />
            );
          }
          if (columnKey === "lot") {
            if (!row.track_lots) {
              return <Typography.Text type="secondary">—</Typography.Text>;
            }
            return (
              <TransferLineLotField
                itemId={row.item_id}
                warehouseId={fromWarehouseId}
                value={row.lot_id}
                readOnly={readOnly}
                t={t}
                onChange={(value) => onPatchLine(index, { lot_id: value })}
              />
            );
          }
          if (columnKey === "on_hand") {
            return (
              <TransferLineOnHandCell
                itemId={row.item_id}
                warehouseId={fromWarehouseId}
                lotId={row.lot_id}
                trackLots={row.track_lots}
                t={t}
              />
            );
          }
          if (columnKey === "uom") {
            return (
              <StockLineUomField
                itemId={row.item_id}
                value={row.item_uom_id}
                readOnly={readOnly}
                t={t}
                prefer="base"
                onChange={(value) => onPatchLine(index, { item_uom_id: value })}
              />
            );
          }
          if (columnKey === "received") {
            return formatStockQuantity(row.received_quantity ?? 0);
          }
          if (columnKey === "open") {
            return formatStockQuantity(row.open_quantity ?? row.quantity);
          }
          return (
            <TenantNumberInput
              kind="quantity"
              className="w-full"
              min={0.000001}
              placeholder={t("transferLineQtyPlaceholder")}
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
