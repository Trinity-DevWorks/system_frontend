"use client";

import LinesGrid from "@/shared/components/lines-grid/LinesGrid";
import ResourceDrawerPanelHeader from "@/shared/components/resource-drawer/ResourceDrawerPanelHeader";
import { isPersistedEntityId } from "@/lib/entityId";
import { formatStockQuantity } from "../../utils/formatStockQuantity";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import SerialNumbersField from "../SerialNumbersField";
import StockLotSelect from "../StockLotSelect";
import { useTransferLineLotOptions } from "../../queries/useStockTransferDrawerData";

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
function BexLineLotField({ itemId, warehouseId, value, readOnly, t, onChange }) {
  const { options, pending } = useTransferLineLotOptions({
    itemId,
    warehouseId,
    enabled: !readOnly && isPersistedEntityId(itemId) && warehouseId != null,
    t,
  });

  return (
    <StockLotSelect
      placeholder={t("bexLineLotPlaceholder")}
      value={value}
      options={options}
      loading={pending}
      disabled={readOnly || itemId == null}
      onChange={onChange}
    />
  );
}

/**
 * @param {{
 *   lines: import("../../utils/bundleExplosionDrawerUtils").BexLineFormRow[];
 *   readOnly: boolean;
 *   warehouseId?: number;
 *   onPatchLine: (index: number, patch: Partial<import("../../utils/bundleExplosionDrawerUtils").BexLineFormRow>) => void;
 *   t: (key: string) => string;
 * }} props
 */
export default function BundleExplosionLineEditor({ lines, readOnly, warehouseId, onPatchLine, t }) {
  const showLotColumn = lines.some((line) => line.track_lots);

  const showSerialColumn = lines.some((line) => line.track_serials);
  const tSerials = useTranslations("SerialNumbers");

  const columns = useMemo(
    () => [
      { key: "item", label: t("bexLineItem"), width: "minmax(220px, 1fr)" },
      { key: "theoretical", label: t("bexLineTheoretical"), width: "120px" },
      { key: "quantity", label: t("bexLineQuantity"), width: "120px" },
      { key: "uom", label: t("bexLineUom"), width: "110px" },
      ...(showLotColumn ? [{ key: "lot", label: t("bexLineLot"), width: "200px" }] : []),
      ...(showSerialColumn ? [{ key: "serials", label: tSerials("column"), width: "140px" }] : []),
    ],
    [t, tSerials, showLotColumn, showSerialColumn],
  );

  return (
    <section className="item-lines-panel">
      <ResourceDrawerPanelHeader title={t("bexLinesTitle")} description={t("bexLinesDescription")} />

      <LinesGrid
        columns={columns}
        lines={lines}
        canAddLine={false}
        onAddLine={() => {}}
        addLabel={t("panelAddRow")}
        deleteAriaLabel={t("panelDeleteConfirm")}
        onRemoveLine={() => {}}
        canRemoveLine={false}
        readOnly={readOnly}
        renderField={(line, index, columnKey) => {
          const row = /** @type {import("../../utils/bundleExplosionDrawerUtils").BexLineFormRow} */ (line);
          if (columnKey === "item") {
            return <span className="truncate">{row.item_label || "—"}</span>;
          }
          if (columnKey === "theoretical") {
            return (
              <span className="block w-full truncate tabular-nums">
                {formatStockQuantity(row.theoretical_quantity)}
              </span>
            );
          }
          if (columnKey === "uom") {
            return <span className="truncate">{row.item_uom_label || "—"}</span>;
          }
          if (columnKey === "serials") {
            if (!row.track_serials) return "—";
            return (
              <SerialNumbersField
                mode="out"
                value={row.serial_numbers}
                quantity={Number(row.quantity) || 0}
                itemId={row.item_id}
                itemName={row.item_label}
                warehouseId={warehouseId}
                readOnly={readOnly}
                onChange={(serials) => onPatchLine(index, { serial_numbers: serials })}
              />
            );
          }
          if (columnKey === "lot") {
            if (!row.track_lots) return "—";
            return (
              <BexLineLotField
                itemId={row.item_id}
                warehouseId={warehouseId}
                value={row.lot_id}
                readOnly={readOnly}
                t={t}
                onChange={(value) => onPatchLine(index, { lot_id: value })}
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
