"use client";

import LinesGrid from "@/shared/components/lines-grid/LinesGrid";
import ResourceDrawerPanelHeader from "@/shared/components/resource-drawer/ResourceDrawerPanelHeader";
import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import { isPersistedEntityId } from "@/lib/entityId";
import { Select } from "antd";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import { useMemo } from "react";
import { PO_BASE_UOM } from "../../utils/purchaseOrderDrawerUtils";
import { usePurchaseOrderLineUomOptions } from "../../queries/usePurchaseOrderDrawerData";
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
function OsLineUomField({ itemId, value, readOnly, t, onChange }) {
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
 *   lines: import("../../utils/openingStockDrawerUtils").OsLineFormRow[];
 *   readOnly: boolean;
 *   warehouseId?: number;
 *   itemOptions?: { value: string; label: string; track_lots?: boolean }[];
 *   itemsPending?: boolean;
 *   onPatchLine: (index: number, patch: Partial<import("../../utils/openingStockDrawerUtils").OsLineFormRow>) => void;
 *   onRemoveLine: (index: number) => void;
 *   onAddLine: () => void;
 *   t: (key: string) => string;
 * }} props
 */
export default function OpeningStockLineEditor({
  lines,
  readOnly,
  warehouseId,
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
      { key: "item", label: t("osLineItem"), width: "minmax(220px, 1fr)" },
      { key: "quantity", label: t("osLineQuantity"), width: "120px" },
      { key: "uom", label: t("osLineUom"), width: "150px" },
      ...(showLotColumn ? [{ key: "lot", label: t("osLineLot"), width: "220px" }] : []),
      { key: "unit_cost", label: t("osLineUnitCost"), width: "130px" },
    ],
    [t, showLotColumn],
  );

  return (
    <section className="item-lines-panel">
      <ResourceDrawerPanelHeader title={t("osLinesTitle")} description={t("osLinesDescription")} />

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
          const row = /** @type {import("../../utils/openingStockDrawerUtils").OsLineFormRow} */ (line);
          if (columnKey === "item") {
            return (
              <Select
                showSearch
                optionFilterProp="label"
                className="w-full"
                placeholder={t("osLineItemPlaceholder")}
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
          if (columnKey === "uom") {
            return (
              <OsLineUomField
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
            return (
              <InboundLotFields
                itemId={row.item_id}
                warehouseId={warehouseId}
                lotId={row.lot_id}
                lotNumber={row.lot_number}
                expiryDate={row.expiry_date}
                readOnly={readOnly}
                t={t}
                lotPlaceholder={t("osLineLotPlaceholder")}
                lotNumberPlaceholder={t("osLineLotNumberPlaceholder")}
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
          return (
            <TenantNumberInput
              kind="quantity"
              className="w-full"
              min={0.000001}
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
