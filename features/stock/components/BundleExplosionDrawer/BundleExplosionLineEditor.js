"use client";

import LinesGrid from "@/shared/components/lines-grid/LinesGrid";
import ResourceDrawerPanelHeader from "@/shared/components/resource-drawer/ResourceDrawerPanelHeader";
import { isPersistedEntityId } from "@/lib/entityId";
import { InputNumber } from "antd";
import { useMemo } from "react";
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

  const columns = useMemo(
    () => [
      { key: "item", label: t("bexLineItem"), width: "minmax(220px, 1fr)" },
      { key: "theoretical", label: t("bexLineTheoretical"), width: "120px" },
      { key: "quantity", label: t("bexLineQuantity"), width: "120px" },
      { key: "uom", label: t("bexLineUom"), width: "110px" },
      ...(showLotColumn ? [{ key: "lot", label: t("bexLineLot"), width: "200px" }] : []),
    ],
    [t, showLotColumn],
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
            return <InputNumber className="w-full" value={row.theoretical_quantity} disabled />;
          }
          if (columnKey === "uom") {
            return <span className="truncate">{row.item_uom_label || "—"}</span>;
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
            <InputNumber
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
