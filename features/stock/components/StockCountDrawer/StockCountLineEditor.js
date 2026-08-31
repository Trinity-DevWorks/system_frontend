"use client";

import LinesGrid from "@/shared/components/lines-grid/LinesGrid";
import ResourceDrawerPanelHeader from "@/shared/components/resource-drawer/ResourceDrawerPanelHeader";
import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import { Button, InputNumber, Select } from "antd";
import { useEffect, useMemo, useRef } from "react";
import InboundLotFields from "../InboundLotFields";
import { useStockBalanceOnHand } from "../../queries/useStockBalanceOnHand";
import {
  canCntCreateLot,
  cntLineVariance,
  isCntSurplusLine,
} from "../../utils/stockCountDrawerUtils";

/**
 * Fills theoretical qty and warehouse unit cost when an item (and lot) is chosen.
 *
 * @param {{
 *   itemId?: string;
 *   warehouseId?: number;
 *   lotId?: number;
 *   lotNumber?: string;
 *   trackLots?: boolean;
 *   theoretical?: number;
 *   unitCost?: number | null;
 *   enabled: boolean;
 *   onApply: (patch: { theoretical_quantity?: number; unit_cost?: number }) => void;
 * }} props
 */
function CntLineBalanceSync({
  itemId,
  warehouseId,
  lotId,
  lotNumber,
  trackLots,
  theoretical,
  unitCost,
  enabled,
  onApply,
}) {
  const newLot = Boolean(trackLots) && lotId == null && Boolean(String(lotNumber ?? "").trim());
  const balance = useStockBalanceOnHand({
    itemId,
    warehouseId,
    lotId,
    trackLots,
    newLot,
  });
  const onApplyRef = useRef(onApply);
  onApplyRef.current = onApply;

  useEffect(() => {
    if (!enabled || !itemId) return;
    if (balance.waitingOnWarehouse || balance.waitingOnLot || balance.pending) return;
    if (balance.quantity == null || !Number.isFinite(balance.quantity)) return;

    /** @type {{ theoretical_quantity?: number; unit_cost?: number }} */
    const patch = {};
    if (theoretical !== balance.quantity) {
      patch.theoretical_quantity = balance.quantity;
    }
    if (unitCost == null && balance.unitCost != null && balance.unitCost > 0) {
      patch.unit_cost = balance.unitCost;
    }
    if (Object.keys(patch).length > 0) onApplyRef.current(patch);
  }, [
    enabled,
    itemId,
    balance.waitingOnWarehouse,
    balance.waitingOnLot,
    balance.pending,
    balance.quantity,
    balance.unitCost,
    theoretical,
    unitCost,
  ]);

  return null;
}

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
        actionsClassName="self-end !pt-0"
        actions={
          !readOnly && onLoadBalances ? (
            <Button disabled={!canLoadBalances || loadingBalances} loading={loadingBalances} onClick={onLoadBalances}>
              {t("cntLoadBalances")}
            </Button>
          ) : null
        }
      />

      {lines.map((line, index) => (
        <CntLineBalanceSync
          key={`cnt-balance-${index}-${line.item_id ?? "none"}-${line.lot_id ?? line.lot_number ?? "none"}`}
          itemId={line.item_id}
          warehouseId={warehouseId}
          lotId={line.lot_id}
          lotNumber={line.lot_number}
          trackLots={line.track_lots}
          theoretical={line.theoretical_quantity}
          unitCost={line.unit_cost}
          enabled={!readOnly}
          onApply={(patch) => onPatchLine(index, patch)}
        />
      ))}

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
                    ...("lot_id" in patch || "lot_number" in patch
                      ? { theoretical_quantity: undefined, unit_cost: undefined }
                      : {}),
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
