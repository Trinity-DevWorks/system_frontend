"use client";

import { linePriceFromPrimary } from "@/lib/currency/documentExchangeRate";
import { formatTenantMoneyWithSymbol, formatTenantNumber } from "@/lib/tenant-format";
import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import LinesGrid from "@/shared/components/lines-grid/LinesGrid";
import ServerSearchSelect from "@/shared/components/selects/ServerSearchSelect";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import { useSalesInvoiceLineUomOptions } from "@/features/sales-invoices/queries/useSalesInvoiceDrawerData";
import {
  SALES_INVOICE_ITEM_RECENT_KIND,
  SALES_INVOICE_ITEM_SELECTOR_PARAMS,
  fetchSalesInvoiceItemSelectorPage,
} from "@/features/sales-invoices/api/salesInvoiceSelectors.api";
import { SI_BASE_UOM, salesInvoiceSelectFilter } from "@/features/sales-invoices/utils/salesInvoiceDrawerUtils";
import { previewLineAmounts, previewLineTaxRate } from "@/features/sales-invoices/utils/salesInvoiceTax";
import { ITEMS_LIST_QUERY_KEY } from "@/features/items";
import { Input, Select } from "antd";
import { useEffect, useMemo, useRef } from "react";
import { emptyCommercialLine } from "../utils/commercialDocumentUtils";

/**
 * @param {{
 *   itemId?: string;
 *   value?: number | string;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   onChange: (value: number | string, option?: Record<string, unknown>) => void;
 *   onDefaults: (option: Record<string, unknown>) => void;
 * }} props
 */
function CommercialUomField({ itemId, value, readOnly, t, onChange, onDefaults }) {
  const { options, pending } = useSalesInvoiceLineUomOptions({ itemId, t, enabled: Boolean(itemId) });
  const appliedRef = useRef("");

  useEffect(() => {
    if (readOnly || !itemId || options.length === 0) return;
    const key = `${itemId}:${options.map((row) => row.value).join(",")}`;
    if (appliedRef.current === key) return;
    if (value != null && value !== SI_BASE_UOM) {
      appliedRef.current = key;
      return;
    }
    const preferred = options.find((row) => row.is_default_sale) ?? options.find((row) => row.is_base) ?? options[0];
    if (!preferred) return;
    appliedRef.current = key;
    onDefaults(/** @type {Record<string, unknown>} */ (preferred));
  }, [itemId, onDefaults, options, readOnly, value]);

  if (readOnly) {
    const label = options.find((row) => String(row.value) === String(value))?.searchText ?? "";
    return <span className="item-lines-readonly-uom">{label || "\u2014"}</span>;
  }

  return (
    <Select
      className="w-full"
      disabled={!itemId}
      loading={pending}
      value={value === SI_BASE_UOM ? undefined : value}
      options={options}
      showSearch
      optionFilterProp="searchText"
      filterOption={(input, option) => salesInvoiceSelectFilter(input, option)}
      getPopupContainer={drawerSelectGetPopup}
      onChange={(next, option) => onChange(next, /** @type {Record<string, unknown>} */ (option))}
    />
  );
}

/**
 * @param {{
 *   t: (key: string) => string;
 *   lines: import("../utils/commercialDocumentUtils").CommercialLine[];
 *   readOnly: boolean;
 *   exchangeRate: number;
 *   priceDecimals: number;
 *   currencySymbol: string;
 *   taxEnabled: boolean;
 *   pricesIncludeTax: boolean;
 *   customerExempt: boolean;
 *   settings: { priceDecimalPlaces?: number; priceRoundingMode?: string } | null;
 *   onChange: (lines: import("../utils/commercialDocumentUtils").CommercialLine[]) => void;
 * }} props
 */
export default function CommercialDocumentLineEditor({
  t,
  lines,
  readOnly,
  exchangeRate,
  priceDecimals,
  currencySymbol,
  taxEnabled,
  pricesIncludeTax,
  customerExempt,
  settings,
  onChange,
}) {
  const columns = useMemo(
    () => [
      { key: "line_no", label: t("lineNo"), width: "56px" },
      { key: "item", label: t("lineItem"), width: "minmax(160px, 1fr)" },
      { key: "description", label: t("lineDescription"), width: "minmax(180px, 1.2fr)" },
      { key: "uom", label: t("lineUom"), width: "120px" },
      { key: "quantity", label: t("lineQuantity"), width: "120px" },
      { key: "unit_price", label: t("linePrice"), width: "140px" },
      { key: "discount_percent", label: t("lineDiscount"), width: "100px" },
      { key: "tax_rate", label: t("lineTaxRate"), width: "72px" },
      { key: "line_total", label: t("lineTotal"), width: "140px" },
    ],
    [t],
  );

  const patch = (index, partial) => {
    onChange(lines.map((line, i) => (i === index ? { ...line, ...partial } : line)));
  };

  return (
    <section className="item-lines-panel">
      <LinesGrid
        columns={columns}
        lines={lines}
        canAddLine={!readOnly}
        onAddLine={() => onChange([...lines, emptyCommercialLine()])}
        addLabel={t("lineAdd")}
        deleteAriaLabel={t("lineRemove")}
        onRemoveLine={(index) => onChange(lines.filter((_, i) => i !== index))}
        readOnly={readOnly}
        renderField={(line, index, columnKey) => {
          const row = /** @type {import("../utils/commercialDocumentUtils").CommercialLine} */ (line);
          const taxRate = previewLineTaxRate({
            row,
            itemOption: row.vat_percentage != null ? { vat_percentage: row.vat_percentage } : null,
            taxEnabled,
            customerExempt,
          });
          const live = !readOnly ? previewLineAmounts({ row, taxRate, pricesIncludeTax, settings }) : null;
          const total = live?.line_total ?? row.line_total;

          if (columnKey === "line_no") {
            return <span className="item-lines-readonly-uom item-lines-line-no">{index + 1}</span>;
          }
          if (columnKey === "item") {
            if (readOnly) {
              return <span className="item-lines-readonly-uom">{row.item_label || "\u2014"}</span>;
            }
            return (
              <ServerSearchSelect
                className="w-full"
                value={row.item_id}
                fetchPage={fetchSalesInvoiceItemSelectorPage}
                queryKey={ITEMS_LIST_QUERY_KEY}
                queryParams={SALES_INVOICE_ITEM_SELECTOR_PARAMS}
                recentKind={SALES_INVOICE_ITEM_RECENT_KIND}
                seedOptions={row.item_id ? [{ value: row.item_id, label: row.item_label || row.item_id }] : []}
                recentLabel={t("selectorRecent")}
                clearRecentLabel={t("selectorClearRecent")}
                resultsLabel={t("selectorResults")}
                loadMoreLabel={t("selectorLoadMore")}
                emptyLabel={t("selectorEmpty")}
                typeToSearchLabel={t("selectorTypeToSearch")}
                getPopupContainer={drawerSelectGetPopup}
                onChange={(value, option) => {
                  if (value == null || value === "") {
                    patch(index, emptyCommercialLine());
                    return;
                  }
                  patch(index, {
                    item_id: String(value),
                    item_label: String(option?.label ?? value),
                    vat_percentage: option?.vat_percentage != null ? Number(option.vat_percentage) : 0,
                    item_uom_id: SI_BASE_UOM,
                    unit_price: undefined,
                    description: typeof option?.description === "string" ? option.description : "",
                  });
                }}
              />
            );
          }
          if (columnKey === "description") {
            if (readOnly) {
              return <span className="item-lines-readonly-uom">{row.description || "\u2014"}</span>;
            }
            return (
              <Input
                className="w-full"
                maxLength={500}
                disabled={!row.item_id}
                value={row.description ?? ""}
                placeholder={t("lineDescriptionPlaceholder")}
                onChange={(event) => patch(index, { description: event.target.value })}
              />
            );
          }
          if (columnKey === "uom") {
            return (
              <CommercialUomField
                itemId={row.item_id}
                value={row.item_uom_id}
                readOnly={readOnly}
                t={t}
                onDefaults={(option) => {
                  const price =
                    row.unit_price == null && option.selling_price != null
                      ? linePriceFromPrimary(option.selling_price, exchangeRate, priceDecimals)
                      : null;
                  patch(index, {
                    item_uom_id: /** @type {number} */ (option.value),
                    ...(price ?? {}),
                  });
                }}
                onChange={(value, option) => {
                  const price =
                    option?.selling_price != null
                      ? linePriceFromPrimary(option.selling_price, exchangeRate, priceDecimals)
                      : null;
                  patch(index, { item_uom_id: value, ...(price ?? {}) });
                }}
              />
            );
          }
          if (columnKey === "quantity") {
            return (
              <TenantNumberInput
                kind="quantity"
                className="w-full"
                min={0.000001}
                disabled={readOnly}
                value={row.quantity}
                onChange={(value) => patch(index, { quantity: value ?? undefined })}
              />
            );
          }
          if (columnKey === "unit_price") {
            return (
              <TenantNumberInput
                kind="money"
                className="w-full"
                min={0}
                disabled={readOnly}
                value={row.unit_price}
                onChange={(value) => patch(index, { unit_price: value ?? undefined })}
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
                disabled={readOnly}
                value={row.discount_percent}
                onChange={(value) => patch(index, { discount_percent: value ?? 0 })}
              />
            );
          }
          if (columnKey === "tax_rate") {
            return (
              <span className="item-lines-readonly-uom">
                {taxRate != null
                  ? `${formatTenantNumber(taxRate, { decimals: 4, trimTrailingZeros: true })}%`
                  : "\u2014"}
              </span>
            );
          }
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
