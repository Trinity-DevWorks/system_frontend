"use client";

import LinesGrid from "@/shared/components/lines-grid/LinesGrid";
import ResourceDrawerPanelHeader from "@/shared/components/resource-drawer/ResourceDrawerPanelHeader";
import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import { Button, InputNumber, Select } from "antd";
import { useMemo } from "react";
import InboundLotFields from "../InboundLotFields";
import {
  canCntCreateLot,
  cntLineVariance,
  isCntSurplusLine,
} from "../../utils/stockCountDrawerUtils";

/**
 * @param {{
 *   lines: import("../../utils/stockCountDrawerUtils").CntLineFormRow[];
 *   readOnly: boolean;
 *   warehouseId?: number;
 *   itemOptions?: { value: string; label: string; track_lots?: boolean; item_uom_label?: string }[];
 *   itemsPending?: boolean;
 *   canLoadBalances?: boolean;
 *   loadingBalances?: boolean;
 *   onLoadBalances?: () => void;
 *   onPatchLine: (index: number, patch: Partial<import("../../utils/stockCountDrawerUtils").CntLineFormRow>) => void;
 *   onRemoveLine: (index: number) => void;
 *   onAddLine: () => void;
 *   t: (key: string) => string;
 * }} props
 */
export default function StockCountLineEditor({
  lines,
  readOnly,
  warehouseId,
  itemOptions = [],
  itemsPending = false,
  canLoadBalances = false,
  loadingBalances = false,
  onLoadBalances,
  onPatchLine,
  onRemoveLine,
  onAddLine,
  t,
}) {
  const showLotColumn = lines.some((line) => line.track_lots);

  const columns = useMemo(
    () => [
      { key: "item", label: t("cntLineItem"), width: "minmax(220px, 1fr)" },
      { key: "theoretical", label: t("cntLineTheoretical"), width: "120px" },
      { key: "counted", label: t("cntLineCounted"), width: "120px" },
      { key: "variance", label: t("cntLineVariance"), width: "120px" },
      { key: "uom", label: t("cntLineUom"), width: "110px" },
      ...(showLotColumn ? [{ key: "lot", label: t("cntLineLot"), width: "220px" }] : []),
      { key: "unit_cost", label: t("cntLineUnitCost"), width: "130px" },
    ],
    [t, showLotColumn],
  );

  return (
    <section className="item-lines-panel">
      <ResourceDrawerPanelHeader
        title={t("cntLinesTitle")}
        description={t("cntLinesDescription")}
        actions={
          !readOnly && onLoadBalances ? (
            <Button disabled={!canLoadBalances || loadingBalances} loading={loadingBalances} onClick={onLoadBalances}>
              {t("cntLoadBalances")}
            </Button>
          ) : null
        }
      />

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
          const row = /** @type {import("../../utils/stockCountDrawerUtils").CntLineFormRow} */ (line);
          if (columnKey === "item") {
            return (
              <Select
                showSearch
                optionFilterProp="label"
                className="w-full"
                placeholder={t("cntLineItemPlaceholder")}
                value={row.item_id}
                options={itemOptions}
                loading={itemsPending}
                disabled={readOnly}
                getPopupContainer={drawerSelectGetPopup}
                onChange={(value) => {
                  const selected = itemOptions.find((option) => option.value === value);
                  onPatchLine(index, {
                    item_id: value,
                    theoretical_quantity: undefined,
                    track_lots: Boolean(selected?.track_lots),
                    item_uom_label: typeof selected?.item_uom_label === "string" ? selected.item_uom_label : "",
                    lot_id: undefined,
                    lot_number: "",
                    expiry_date: "",
                    unit_cost: undefined,
                  });
                }}
              />
            );
          }
          if (columnKey === "theoretical") {
            return <InputNumber className="w-full" value={row.theoretical_quantity} disabled />;
          }
          if (columnKey === "variance") {
            return <InputNumber className="w-full" value={cntLineVariance(row)} disabled />;
          }
          if (columnKey === "uom") {
            return <span className="truncate">{row.item_uom_label || "—"}</span>;
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
                allowNewLot={canCntCreateLot(row)}
                t={t}
                lotPlaceholder={t("cntLineLotPlaceholder")}
                lotNumberPlaceholder={t("cntLineLotNumberPlaceholder")}
                onPatch={(patch) =>
                  onPatchLine(index, {
                    ...patch,
                    ...("lot_id" in patch ? { theoretical_quantity: undefined } : {}),
                  })
                }
              />
            );
          }
          if (columnKey === "unit_cost") {
            return (
              <InputNumber
                className="w-full"
                min={0}
                step={0.0001}
                value={row.unit_cost}
                disabled={readOnly || !isCntSurplusLine(row)}
                onChange={(value) => onPatchLine(index, { unit_cost: value ?? undefined })}
              />
            );
          }
          return (
            <InputNumber
              className="w-full"
              min={0}
              value={row.counted_quantity}
              disabled={readOnly}
              onChange={(value) => onPatchLine(index, { counted_quantity: value ?? undefined })}
            />
          );
        }}
      />
    </section>
  );
}
