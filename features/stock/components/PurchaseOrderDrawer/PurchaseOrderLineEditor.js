"use client";

import LinesGrid from "@/shared/components/lines-grid/LinesGrid";
import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import { Input, Select } from "antd";
import { formatTenantMoneyWithSymbol, formatTenantNumber } from "@/lib/tenant-format";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import { previewLineAmounts, previewLineTaxRate } from "@/features/sales-invoices/utils/salesInvoiceTax";
import { useMemo } from "react";
import { PO_BASE_UOM } from "../../utils/purchaseOrderDrawerUtils";
import { suggestedPurchaseOrderUnitPrice } from "../../utils/purchaseOrderLastPurchasePrice";
import StockLineUomField from "../StockLineUomField";

/**
 * Purchase order lines, same grid and columns as the sales order line editor.
 *
 * @param {{
 *   lines: import("../../utils/purchaseOrderDrawerUtils").PurchaseOrderLineFormRow[];
 *   readOnly: boolean;
 *   itemOptions: { value: string; label: string; vat_percentage?: number }[];
 *   itemsPending: boolean;
 *   lastPriceByItemId: Map<string, number>;
 *   canAddLine: boolean;
 *   currencySymbol: string;
 *   taxEnabled: boolean;
 *   pricesIncludeTax: boolean;
 *   supplierExempt: boolean;
 *   settings: { priceDecimalPlaces?: number; priceRoundingMode?: string } | null;
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
  lastPriceByItemId,
  canAddLine,
  currencySymbol,
  taxEnabled,
  pricesIncludeTax,
  supplierExempt,
  settings,
  onPatchLine,
  onRemoveLine,
  onAddLine,
  t,
}) {
  const columns = useMemo(
    () => [
      { key: "line_no", label: t("poLineNo"), width: "56px" },
      { key: "item", label: t("poLineItem"), width: "minmax(160px, 1fr)" },
      { key: "description", label: t("poLineDescription"), width: "minmax(180px, 1.2fr)" },
      { key: "uom", label: t("poLineUom"), width: "120px" },
      { key: "quantity", label: t("poLineQuantity"), width: "120px" },
      { key: "unit_price", label: t("poLineUnitPrice"), width: "140px" },
      { key: "discount_percent", label: t("poLineDiscount"), width: "100px" },
      { key: "tax_rate", label: t("poLineTaxRate"), width: "72px" },
      { key: "line_total", label: t("poLineTotal"), width: "140px" },
    ],
    [t],
  );

  const itemsById = useMemo(() => new Map(itemOptions.map((row) => [String(row.value), row])), [itemOptions]);

  return (
    <section className="item-lines-panel">
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
          const itemOption = row.item_id != null ? itemsById.get(String(row.item_id)) ?? null : null;

          if (columnKey === "line_no") {
            return <span className="item-lines-readonly-uom item-lines-line-no">{index + 1}</span>;
          }
          if (columnKey === "item") {
            if (readOnly) {
              return <span className="item-lines-readonly-uom">{itemOption?.label || row.item_label || "\u2014"}</span>;
            }
            return (
              <Select
                showSearch
                optionFilterProp="label"
                className="w-full"
                placeholder={t("poLineItemPlaceholder")}
                value={row.item_id}
                options={itemOptions}
                loading={itemsPending}
                getPopupContainer={drawerSelectGetPopup}
                onChange={(value) =>
                  onPatchLine(index, {
                    item_id: value,
                    item_uom_id: PO_BASE_UOM,
                    unit_price: suggestedPurchaseOrderUnitPrice(lastPriceByItemId, value),
                    unitPriceAuto: true,
                  })
                }
              />
            );
          }
          if (columnKey === "description") {
            if (readOnly) {
              return <span className="item-lines-readonly-uom">{row.notes || "\u2014"}</span>;
            }
            return (
              <Input
                className="w-full"
                maxLength={500}
                disabled={!row.item_id}
                value={row.notes ?? ""}
                placeholder={t("poLineDescriptionPlaceholder")}
                onChange={(event) => onPatchLine(index, { notes: event.target.value })}
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
                prefer="purchase"
                onChange={(value) => onPatchLine(index, { item_uom_id: value })}
              />
            );
          }
          if (columnKey === "quantity") {
            return (
              <TenantNumberInput
                kind="quantity"
                className="w-full"
                min={0.000001}
                placeholder={t("poLineQtyPlaceholder")}
                value={row.quantity}
                disabled={readOnly}
                onChange={(value) => onPatchLine(index, { quantity: value ?? undefined })}
              />
            );
          }
          if (columnKey === "unit_price") {
            return (
              <TenantNumberInput
                kind="money"
                className="w-full"
                min={0}
                placeholder={t("poLineUnitPricePlaceholder")}
                value={row.unit_price}
                disabled={readOnly}
                onChange={(value) => onPatchLine(index, { unit_price: value ?? undefined, unitPriceAuto: false })}
              />
            );
          }
          if (columnKey === "discount_percent") {
            return (
              <TenantNumberInput
                kind="percent"
                className="w-full"
                min={0}
                max={100}
                placeholder="0"
                value={row.discount_percent}
                disabled={readOnly}
                onChange={(value) => onPatchLine(index, { discount_percent: value ?? undefined })}
              />
            );
          }

          // Read-only orders show the stored VAT and totals; drafts preview them with the same tax rules as the server.
          const taxRate = readOnly
            ? row.saved_tax_rate ?? null
            : previewLineTaxRate({
                row: { ...row, tax_rate: row.saved_tax_rate },
                itemOption,
                taxEnabled,
                customerExempt: supplierExempt,
              });
          if (columnKey === "tax_rate") {
            return (
              <span className="item-lines-readonly-uom">
                {taxRate != null ? `${formatTenantNumber(taxRate, { decimals: 4, trimTrailingZeros: true })}%` : "\u2014"}
              </span>
            );
          }
          const live = readOnly ? null : previewLineAmounts({ row, taxRate, pricesIncludeTax, settings });
          const total = readOnly ? row.saved_line_total : live?.line_total;
          return (
            <span className="item-lines-readonly-uom">
              {total != null ? formatTenantMoneyWithSymbol(total, currencySymbol) || "\u2014" : "\u2014"}
            </span>
          );
        }}
      />
    </section>
  );
}
