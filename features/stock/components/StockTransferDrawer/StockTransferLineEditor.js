"use client";

import LinesGrid from "@/shared/components/lines-grid/LinesGrid";
import ResourceDrawerPanelHeader from "@/shared/components/resource-drawer/ResourceDrawerPanelHeader";
import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import { InputNumber, Select, Typography } from "antd";
import { useMemo } from "react";
import { STOCK_TRANSFER_BASE_UOM } from "../../utils/stockTransferDrawerUtils";
import { isPersistedEntityId } from "@/lib/entityId";
import StockLotSelect from "../StockLotSelect";
import { useTransferLineLotOptions, useTransferLineUomOptions } from "../../queries/useStockTransferDrawerData";

/**
 * @param {{
 *   itemId?: string;
 *   value?: number | string;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   onChange: (value: number | string) => void;
 * }} props
 */
function TransferLineUomField({ itemId, value, readOnly, t, onChange }) {
  const { options, pending } = useTransferLineUomOptions({
    itemId,
    t,
    enabled: !readOnly && isPersistedEntityId(itemId),
  });

  return (
    <Select
      showSearch
      optionFilterProp="label"
      className="w-full"
      placeholder={t("transferBaseUomOption")}
      value={value ?? STOCK_TRANSFER_BASE_UOM}
      options={options}
      loading={pending}
      disabled={readOnly || itemId == null}
      getPopupContainer={drawerSelectGetPopup}
      onChange={onChange}
    />
  );
}

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

  const columns = useMemo(
    () => [
      { key: "item", label: t("transferLineItem"), width: "minmax(240px, 1fr)" },
      ...(showLotColumn ? [{ key: "lot", label: t("transferLineLot"), width: "220px" }] : []),
      { key: "quantity", label: t("transferLineQuantity"), width: "120px" },
      { key: "uom", label: t("transferLineUom"), width: "160px" },
    ],
    [t, showLotColumn],
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
          if (columnKey === "uom") {
            return (
              <TransferLineUomField
                itemId={row.item_id}
                value={row.item_uom_id}
                readOnly={readOnly}
                t={t}
                onChange={(value) => onPatchLine(index, { item_uom_id: value })}
              />
            );
          }
          return (
            <InputNumber
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
