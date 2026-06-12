"use client";

import ItemDrawerLinesGrid from "@/components/items/ItemDrawerLinesGrid";
import ResourceDrawerPanelHeader from "@/components/resource-drawer/ResourceDrawerPanelHeader";
import { drawerSelectGetPopup } from "@/components/resource-drawer/drawerFormUtils";
import { InputNumber, Select } from "antd";
import { useMemo } from "react";
import { STOCK_TRANSFER_BASE_UOM } from "./stockTransferDrawerUtils";
import { isPersistedEntityId } from "@/lib/entityId";
import { useTransferLineUomOptions } from "./useStockTransferDrawerData";

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
 *   lines: import("./stockTransferDrawerUtils").TransferLineFormRow[];
 *   readOnly: boolean;
 *   itemOptions: { value: number; label: string }[];
 *   itemsPending: boolean;
 *   canAddLine: boolean;
 *   onPatchLine: (index: number, patch: Partial<import("./stockTransferDrawerUtils").TransferLineFormRow>) => void;
 *   onRemoveLine: (index: number) => void;
 *   onAddLine: () => void;
 *   t: (key: string) => string;
 * }} props
 */
export default function StockTransferLineEditor({
  lines,
  readOnly,
  itemOptions,
  itemsPending,
  canAddLine,
  onPatchLine,
  onRemoveLine,
  onAddLine,
  t,
}) {
  const columns = useMemo(
    () => [
      { key: "item", label: t("transferLineItem"), width: "minmax(280px, 1fr)" },
      { key: "quantity", label: t("transferLineQuantity"), width: "120px" },
      { key: "uom", label: t("transferLineUom"), width: "180px" },
    ],
    [t],
  );

  return (
    <section className="item-lines-panel">
      <ResourceDrawerPanelHeader
        title={t("transferLinesTitle")}
        description={t("transferLinesDescription")}
      />

      <ItemDrawerLinesGrid
        columns={columns}
        lines={lines}
        canAddLine={!readOnly && canAddLine}
        onAddLine={onAddLine}
        addLabel={t("panelAddRow")}
        deleteAriaLabel={t("panelDeleteConfirm")}
        onRemoveLine={onRemoveLine}
        readOnly={readOnly}
        renderField={(line, index, columnKey) => {
          const row = /** @type {import("./stockTransferDrawerUtils").TransferLineFormRow} */ (line);
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
                onChange={(value) =>
                  onPatchLine(index, {
                    item_id: value,
                    item_uom_id: STOCK_TRANSFER_BASE_UOM,
                  })
                }
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
