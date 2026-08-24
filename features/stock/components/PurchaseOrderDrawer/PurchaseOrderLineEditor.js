"use client";

import LinesGrid from "@/shared/components/lines-grid/LinesGrid";
import ResourceDrawerPanelHeader from "@/shared/components/resource-drawer/ResourceDrawerPanelHeader";
import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import { isPersistedEntityId } from "@/lib/entityId";
import { InputNumber, Select } from "antd";
import { useMemo } from "react";
import { PO_BASE_UOM } from "../../utils/purchaseOrderDrawerUtils";
import { usePurchaseOrderLineUomOptions } from "../../queries/usePurchaseOrderDrawerData";

/**
 * @param {{
 *   itemId?: string;
 *   value?: number | string;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   onChange: (value: number | string) => void;
 * }} props
 */
function PurchaseOrderLineUomField({ itemId, value, readOnly, t, onChange }) {
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
 * @param {{
 *   lines: import("../../utils/purchaseOrderDrawerUtils").PurchaseOrderLineFormRow[];
 *   readOnly: boolean;
 *   itemOptions: { value: string; label: string }[];
 *   itemsPending: boolean;
 *   canAddLine: boolean;
 *   onPatchLine: (index: number, patch: Partial<import("../../utils/purchaseOrderDrawerUtils").PurchaseOrderLineFormRow>) => void;
 *   onRemoveLine: (index: number) => void;
 *   onAddLine: () => void;
 *   t: (key: string) => string;
 * }} props
 */
export default function PurchaseOrderLineEditor({
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
      { key: "item", label: t("poLineItem"), width: "minmax(240px, 1fr)" },
      { key: "quantity", label: t("poLineQuantity"), width: "110px" },
      { key: "uom", label: t("poLineUom"), width: "160px" },
      { key: "unit_price", label: t("poLineUnitPrice"), width: "120px" },
    ],
    [t],
  );

  return (
    <section className="item-lines-panel">
      <ResourceDrawerPanelHeader
        title={t("poLinesTitle")}
        description={t("poLinesDescription")}
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
          const row = /** @type {import("../../utils/purchaseOrderDrawerUtils").PurchaseOrderLineFormRow} */ (line);
          if (columnKey === "item") {
            return (
              <Select
                showSearch
                optionFilterProp="label"
                className="w-full"
                placeholder={t("poLineItemPlaceholder")}
                value={row.item_id}
                options={itemOptions}
                loading={itemsPending}
                disabled={readOnly}
                getPopupContainer={drawerSelectGetPopup}
                onChange={(value) =>
                  onPatchLine(index, {
                    item_id: value,
                    item_uom_id: PO_BASE_UOM,
                  })
                }
              />
            );
          }
          if (columnKey === "uom") {
            return (
              <PurchaseOrderLineUomField
                itemId={row.item_id}
                value={row.item_uom_id}
                readOnly={readOnly}
                t={t}
                onChange={(value) => onPatchLine(index, { item_uom_id: value })}
              />
            );
          }
          if (columnKey === "unit_price") {
            return (
              <InputNumber
                className="w-full"
                min={0}
                placeholder={t("poLineUnitPricePlaceholder")}
                value={row.unit_price}
                disabled={readOnly}
                onChange={(value) => onPatchLine(index, { unit_price: value ?? undefined })}
              />
            );
          }
          return (
            <InputNumber
              className="w-full"
              min={0.000001}
              placeholder={t("poLineQtyPlaceholder")}
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
