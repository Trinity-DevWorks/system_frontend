"use client";

import LinesGrid from "@/shared/components/lines-grid/LinesGrid";
import ResourceDrawerPanelHeader from "@/shared/components/resource-drawer/ResourceDrawerPanelHeader";
import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import { Select, Typography } from "antd";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import { formatTenantMoney } from "@/lib/tenant-format";
import { isPersistedEntityId } from "@/lib/entityId";
import { useEffect, useMemo, useRef } from "react";
import { formatStockQuantity } from "../../utils/formatStockQuantity";
import { computeSrvValueDelta } from "../../utils/stockRevaluationDrawerUtils";
import { useStockRevaluationBalanceHint } from "../../queries/useStockRevaluationBalanceHint";
import { useTransferLineLotOptions } from "../../queries/useStockTransferDrawerData";
import StockLotSelect from "../StockLotSelect";

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
function SrvLineLotField({ itemId, warehouseId, value, readOnly, t, onChange }) {
  const { options, pending } = useTransferLineLotOptions({
    itemId,
    warehouseId,
    enabled: !readOnly && isPersistedEntityId(itemId) && warehouseId != null,
    t,
  });

  return (
    <StockLotSelect
      placeholder={t("srvColLotPlaceholder")}
      value={value}
      options={options}
      loading={pending}
      disabled={readOnly || itemId == null || warehouseId == null}
      onChange={onChange}
    />
  );
}

/**
 * Prefills on-hand qty and current cost from the balance-hint endpoint.
 *
 * @param {{
 *   itemId?: string;
 *   warehouseId?: number;
 *   lotId?: number;
 *   trackLots?: boolean;
 *   readOnly: boolean;
 *   onApply: (patch: { quantity_on_hand?: number; old_unit_cost?: number | null }) => void;
 * }} props
 */
function SrvBalanceHintSync({ itemId, warehouseId, lotId, trackLots, readOnly, onApply }) {
  const { quantity, unitCost, isSuccess } = useStockRevaluationBalanceHint({
    itemId,
    warehouseId,
    lotId,
    trackLots,
    enabled: !readOnly,
  });
  const appliedKeyRef = useRef(/** @type {string | null} */ (null));

  useEffect(() => {
    if (readOnly || !isSuccess) return;
    const key = `${itemId ?? ""}|${warehouseId ?? ""}|${lotId ?? ""}|${quantity}|${unitCost}`;
    if (appliedKeyRef.current === key) return;
    appliedKeyRef.current = key;
    onApply({
      quantity_on_hand: quantity ?? undefined,
      old_unit_cost: unitCost,
    });
  }, [readOnly, isSuccess, itemId, warehouseId, lotId, quantity, unitCost, onApply]);

  return null;
}

/**
 * @param {{
 *   quantity?: number | null;
 *   waitingOnWarehouse?: boolean;
 *   waitingOnLot?: boolean;
 *   pending?: boolean;
 *   t: (key: string) => string;
 * }} props
 */
function SrvReadOnlyQty({ quantity, waitingOnWarehouse, waitingOnLot, pending, t }) {
  let label = "—";
  if (waitingOnWarehouse) label = t("srvOnHandNeedWarehouse");
  else if (waitingOnLot) label = t("srvOnHandNeedLot");
  else if (pending) label = "…";
  else if (quantity != null && Number.isFinite(quantity)) label = formatStockQuantity(quantity);

  return (
    <Typography.Text type="secondary" className="block truncate tabular-nums">
      {label}
    </Typography.Text>
  );
}

/**
 * @param {{
 *   value?: number | null;
 *   waitingOnWarehouse?: boolean;
 *   waitingOnLot?: boolean;
 *   pending?: boolean;
 *   t: (key: string) => string;
 * }} props
 */
function SrvReadOnlyCost({ value, waitingOnWarehouse, waitingOnLot, pending, t }) {
  let label = "—";
  if (waitingOnWarehouse) label = t("srvOnHandNeedWarehouse");
  else if (waitingOnLot) label = t("srvOnHandNeedLot");
  else if (pending) label = "…";
  else if (value != null && Number.isFinite(value)) label = formatTenantMoney(value) || "—";

  return (
    <Typography.Text type="secondary" className="block truncate tabular-nums">
      {label}
    </Typography.Text>
  );
}

/**
 * Live on-hand / current-cost cells for draft lines (uses balance-hint).
 *
 * @param {{
 *   itemId?: string;
 *   warehouseId?: number;
 *   lotId?: number;
 *   trackLots?: boolean;
 *   quantityOnHand?: number | null;
 *   oldUnitCost?: number | null;
 *   readOnly: boolean;
 *   mode: "qty" | "cost";
 *   t: (key: string) => string;
 * }} props
 */
function SrvHintDisplayCell({
  itemId,
  warehouseId,
  lotId,
  trackLots,
  quantityOnHand,
  oldUnitCost,
  readOnly,
  mode,
  t,
}) {
  const hint = useStockRevaluationBalanceHint({
    itemId,
    warehouseId,
    lotId,
    trackLots,
    enabled: !readOnly && Boolean(itemId),
  });

  if (!itemId) {
    return (
      <Typography.Text type="secondary" className="block truncate tabular-nums">
        —
      </Typography.Text>
    );
  }

  if (readOnly) {
    if (mode === "qty") {
      return (
        <SrvReadOnlyQty
          quantity={quantityOnHand}
          t={t}
        />
      );
    }
    return <SrvReadOnlyCost value={oldUnitCost} t={t} />;
  }

  if (mode === "qty") {
    return (
      <SrvReadOnlyQty
        quantity={hint.pending ? null : (hint.quantity ?? quantityOnHand)}
        waitingOnWarehouse={hint.waitingOnWarehouse}
        waitingOnLot={hint.waitingOnLot}
        pending={hint.pending}
        t={t}
      />
    );
  }

  return (
    <SrvReadOnlyCost
      value={hint.pending ? null : (hint.unitCost ?? oldUnitCost)}
      waitingOnWarehouse={hint.waitingOnWarehouse}
      waitingOnLot={hint.waitingOnLot}
      pending={hint.pending}
      t={t}
    />
  );
}

/**
 * @param {{
 *   lines: import("../../utils/stockRevaluationDrawerUtils").SrvLineFormRow[];
 *   readOnly: boolean;
 *   warehouseId?: number;
 *   itemOptions?: { value: string; label: string; track_lots?: boolean }[];
 *   itemsPending?: boolean;
 *   onPatchLine: (index: number, patch: Partial<import("../../utils/stockRevaluationDrawerUtils").SrvLineFormRow>) => void;
 *   onRemoveLine: (index: number) => void;
 *   onAddLine: () => void;
 *   t: (key: string) => string;
 * }} props
 */
export default function StockRevaluationLineEditor({
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
      { key: "item", label: t("srvColItem"), width: "minmax(200px, 1fr)" },
      ...(showLotColumn ? [{ key: "lot", label: t("srvColLot"), width: "200px" }] : []),
      { key: "on_hand", label: t("srvColOnHand"), width: "110px" },
      { key: "old_cost", label: t("srvColCurrentCost"), width: "130px" },
      { key: "new_cost", label: t("srvColNewCost"), width: "130px" },
      { key: "value_delta", label: t("srvColValueDelta"), width: "130px" },
    ],
    [t, showLotColumn],
  );

  return (
    <section className="item-lines-panel">
      <ResourceDrawerPanelHeader title={t("srvLinesTitle")} description={t("srvLinesDescription")} />

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
          const row = /** @type {import("../../utils/stockRevaluationDrawerUtils").SrvLineFormRow} */ (line);
          if (columnKey === "item") {
            return (
              <>
                {!readOnly ? (
                  <SrvBalanceHintSync
                    itemId={row.item_id}
                    warehouseId={warehouseId}
                    lotId={row.lot_id}
                    trackLots={row.track_lots}
                    readOnly={readOnly}
                    onApply={(patch) => {
                      const nextQty =
                        patch.quantity_on_hand !== undefined
                          ? patch.quantity_on_hand
                          : row.quantity_on_hand;
                      const nextOld =
                        patch.old_unit_cost !== undefined ? patch.old_unit_cost : row.old_unit_cost;
                      onPatchLine(index, {
                        ...patch,
                        value_delta: computeSrvValueDelta(nextQty, nextOld, row.new_unit_cost),
                      });
                    }}
                  />
                ) : null}
                <Select
                  showSearch
                  optionFilterProp="label"
                  className="w-full"
                  placeholder={t("srvColItemPlaceholder")}
                  value={row.item_id}
                  options={itemOptions}
                  loading={itemsPending}
                  disabled={readOnly}
                  getPopupContainer={drawerSelectGetPopup}
                  onChange={(value) => {
                    const selected = itemOptions.find((option) => option.value === value);
                    onPatchLine(index, {
                      item_id: value,
                      track_lots: Boolean(selected?.track_lots),
                      lot_id: undefined,
                      lot_number: "",
                      quantity_on_hand: undefined,
                      old_unit_cost: undefined,
                      value_delta: undefined,
                    });
                  }}
                />
              </>
            );
          }
          if (columnKey === "lot") {
            if (!row.track_lots) return "—";
            return (
              <SrvLineLotField
                itemId={row.item_id}
                warehouseId={warehouseId}
                value={row.lot_id}
                readOnly={readOnly}
                t={t}
                onChange={(value) =>
                  onPatchLine(index, {
                    lot_id: value ?? undefined,
                    quantity_on_hand: undefined,
                    old_unit_cost: undefined,
                    value_delta: undefined,
                  })
                }
              />
            );
          }
          if (columnKey === "on_hand") {
            return (
              <SrvHintDisplayCell
                itemId={row.item_id}
                warehouseId={warehouseId}
                lotId={row.lot_id}
                trackLots={row.track_lots}
                quantityOnHand={row.quantity_on_hand}
                oldUnitCost={row.old_unit_cost}
                readOnly={readOnly}
                mode="qty"
                t={t}
              />
            );
          }
          if (columnKey === "old_cost") {
            return (
              <SrvHintDisplayCell
                itemId={row.item_id}
                warehouseId={warehouseId}
                lotId={row.lot_id}
                trackLots={row.track_lots}
                quantityOnHand={row.quantity_on_hand}
                oldUnitCost={row.old_unit_cost}
                readOnly={readOnly}
                mode="cost"
                t={t}
              />
            );
          }
          if (columnKey === "new_cost") {
            return (
              <TenantNumberInput
                kind="money"
                className="w-full"
                min={0}
                value={row.new_unit_cost}
                disabled={readOnly}
                onChange={(value) => {
                  const newCost = value ?? undefined;
                  onPatchLine(index, {
                    new_unit_cost: newCost,
                    value_delta: computeSrvValueDelta(row.quantity_on_hand, row.old_unit_cost, newCost),
                  });
                }}
              />
            );
          }
          const delta =
            row.value_delta != null
              ? row.value_delta
              : computeSrvValueDelta(row.quantity_on_hand, row.old_unit_cost, row.new_unit_cost);
          return (
            <Typography.Text type="secondary" className="block truncate tabular-nums">
              {delta != null && Number.isFinite(delta) ? formatTenantMoney(delta) || "—" : "—"}
            </Typography.Text>
          );
        }}
      />
    </section>
  );
}
