
"use client";

import LinesGrid from "@/shared/components/lines-grid/LinesGrid";
import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import { isPersistedEntityId } from "@/lib/entityId";
import { formatTenantMoney, formatTenantNumber } from "@/lib/tenant-format";
import { ClearOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import { App, Checkbox, Input, Select } from "antd";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useTranslations } from "next-intl";
import { SI_BASE_UOM, salesInvoiceLinePatchFromBarcodeLookup, salesInvoiceSelectFilter, salesInvoiceWarehouseCodeLabel } from "../../utils/salesInvoiceDrawerUtils";
import { previewLineAmounts, previewLineTaxRate } from "../../utils/salesInvoiceTax";
import {
  useSalesInvoiceItemAvailability,
  useSalesInvoiceLineUomOptions,
} from "../../queries/useSalesInvoiceDrawerData";
import { lookupItemByBarcode } from "@/features/items/index";

/**
 * @param {{
 *   itemId?: string;
 *   value?: number | string;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   onChange: (value: number | string, option?: Record<string, unknown>) => void;
 *   onCatalogDefaults?: (option: Record<string, unknown>) => void;
 * }} props
 */
function SalesInvoiceLineUomField({ itemId, value, readOnly, t, onChange, onCatalogDefaults }) {
  const { options, pending } = useSalesInvoiceLineUomOptions({
    itemId,
    t,
    enabled: !readOnly && isPersistedEntityId(itemId),
  });
  const appliedItemRef = useRef(/** @type {string | null} */ (null));

  useEffect(() => {
    if (itemId == null) {
      appliedItemRef.current = null;
      return;
    }
    if (readOnly || pending || appliedItemRef.current === itemId) return;
    const preferred = options.find((row) => row.is_default_sale) ?? options.find((row) => row.is_base);
    appliedItemRef.current = itemId;
    if (preferred) onCatalogDefaults?.(preferred);
  }, [itemId, pending, readOnly, options, onCatalogDefaults]);

  const selectValue = useMemo(() => {
    if (value != null && value !== SI_BASE_UOM) return value;
    return options.find((row) => row.is_base)?.value;
  }, [options, value]);

  return (
    <Select
      showSearch
      optionFilterProp="label"
      filterOption={salesInvoiceSelectFilter}
      className="w-full"
      placeholder={t("lineUom")}
      value={selectValue}
      options={options}
      loading={pending}
      disabled={readOnly || itemId == null}
      getPopupContainer={drawerSelectGetPopup}
      onChange={(next) => {
        const matched = options.find(
          (row) => row.value === next || String(row.value) === String(next),
        );
        onChange(next, matched);
      }}
    />
  );
}

/**
 * @param {{
 *   itemId?: string;
 *   warehouseId?: number;
 *   value?: number;
 *   trackInventory?: boolean;
 *   headerWarehouseId?: number;
 *   warehouseOptions: { value: number; label: string }[];
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   onChange: (value: number | undefined) => void;
 * }} props
 */
function SalesInvoiceLineWarehouseField({
  itemId,
  warehouseId,
  value,
  trackInventory,
  headerWarehouseId,
  warehouseOptions,
  readOnly,
  t,
  onChange,
}) {
  const { rows, pending } = useSalesInvoiceItemAvailability({
    itemId,
    enabled: Boolean(trackInventory) && isPersistedEntityId(itemId),
  });

  const options = useMemo(() => {
    if (!trackInventory) {
      return warehouseOptions;
    }
    const byId = new Map();
    for (const row of rows) {
      const id = Number(row.warehouse_id);
      const code =
        salesInvoiceWarehouseCodeLabel(row.warehouse) ||
        String(row.warehouse?.name ?? id);
      byId.set(id, {
        value: id,
        label: `${code} (${formatTenantNumber(row.on_hand, { decimals: 6, trimTrailingZeros: true })})`,
        searchText: `${row.warehouse?.shortcut_name ?? ""} ${row.warehouse?.name ?? ""}`,
      });
    }
    if (headerWarehouseId != null && !byId.has(Number(headerWarehouseId))) {
      const header = warehouseOptions.find((w) => Number(w.value) === Number(headerWarehouseId));
      if (header) byId.set(Number(headerWarehouseId), header);
    }
    if (warehouseId != null && !byId.has(Number(warehouseId))) {
      const current = warehouseOptions.find((w) => Number(w.value) === Number(warehouseId));
      if (current) byId.set(Number(warehouseId), current);
    }
    return [...byId.values()];
  }, [trackInventory, rows, warehouseOptions, headerWarehouseId, warehouseId]);

  return (
    <Select
      allowClear={!trackInventory}
      showSearch
      optionFilterProp="label"
      filterOption={salesInvoiceSelectFilter}
      className="w-full"
      placeholder={t("lineWarehousePlaceholder")}
      value={value}
      options={options}
      loading={pending}
      disabled={readOnly || itemId == null}
      getPopupContainer={drawerSelectGetPopup}
      onChange={(next) => onChange(next ?? undefined)}
    />
  );
}

/**
 * @param {{
 *   itemId?: string;
 *   warehouseId?: number;
 *   value?: number;
 *   trackLots?: boolean;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   onChange: (value: number | undefined) => void;
 * }} props
 */
function SalesInvoiceLineLotField({ itemId, warehouseId, value, trackLots, readOnly, t, onChange }) {
  const { rows, pending } = useSalesInvoiceItemAvailability({
    itemId,
    enabled: Boolean(trackLots) && isPersistedEntityId(itemId),
  });

  const options = useMemo(() => {
    const warehouse = rows.find((row) => Number(row.warehouse_id) === Number(warehouseId));
    return (warehouse?.lots ?? []).map((lot) => ({
      value: lot.id,
      label: lot.expiry_date ? `${lot.lot_number} (${lot.expiry_date})` : String(lot.lot_number ?? lot.id),
    }));
  }, [rows, warehouseId]);

  if (!trackLots) {
    return <span className="item-lines-readonly-uom">{"\u2014"}</span>;
  }

  return (
    <Select
      showSearch
      optionFilterProp="label"
      className="w-full"
      placeholder={t("lineLotPlaceholder")}
      value={value}
      options={options}
      loading={pending}
      disabled={readOnly || itemId == null || warehouseId == null}
      getPopupContainer={drawerSelectGetPopup}
      onChange={(next) => onChange(next ?? undefined)}
    />
  );
}

/**
 * @param {{
 *   lines: import("../../utils/salesInvoiceDrawerUtils").SalesInvoiceLineFormRow[];
 *   readOnly: boolean;
 *   itemOptions: { value: string; label: string; track_inventory?: boolean; track_lots?: boolean; vat_percentage?: number }[];
 *   taxContext: {
 *     taxEnabled: boolean;
 *     pricesIncludeTax: boolean;
 *     customerExempt: boolean;
 *     settings: { priceDecimalPlaces?: number; priceRoundingMode?: string };
 *   };
 *   warehouseOptions: { value: number; label: string }[];
 *   itemsPending: boolean;
 *   headerWarehouseId?: number;
 *   canAddLine: boolean;
 *   canViewItem?: boolean;
 *   onPatchLine: (index: number, patch: Partial<import("../../utils/salesInvoiceDrawerUtils").SalesInvoiceLineFormRow>) => void;
 *   onClearLine: (index: number) => void;
 *   onRemoveLine: (index: number) => void;
 *   onAddLine: () => void;
 *   onViewItem?: (itemId: string) => void;
 *   t: (key: string) => string;
 * }} props
 */
export default function SalesInvoiceLineEditor({
  lines,
  readOnly,
  itemOptions,
  taxContext = {
    taxEnabled: true,
    pricesIncludeTax: false,
    customerExempt: false,
    settings: { priceDecimalPlaces: 2, priceRoundingMode: "half_up" },
  },
  warehouseOptions,
  itemsPending,
  headerWarehouseId,
  canAddLine,
  canViewItem = true,
  onPatchLine,
  onClearLine,
  onRemoveLine,
  onAddLine,
  onViewItem,
  t,
}) {
  const tApiErrors = useTranslations("ApiErrors");
  const { notification } = App.useApp();
  const [barcodePendingIndex, setBarcodePendingIndex] = useState(/** @type {number | null} */ (null));
  const [selectedLineIndexes, setSelectedLineIndexes] = useState(() => new Set());
  /** Last barcode successfully applied per line — used so only a true rescan bumps qty. */
  const lastAppliedBarcodeRef = useRef(/** @type {Record<number, string>} */ ({}));

  useEffect(() => {
    setSelectedLineIndexes((prev) => {
      const next = new Set([...prev].filter((index) => index < lines.length));
      return next.size === prev.size ? prev : next;
    });
    const committed = lastAppliedBarcodeRef.current;
    for (const key of Object.keys(committed)) {
      if (Number(key) >= lines.length) delete committed[Number(key)];
    }
  }, [lines.length]);

  const clearCommittedBarcode = (index) => {
    delete lastAppliedBarcodeRef.current[index];
  };

  const noteBarcodeFieldEdit = (index, value) => {
    const committed = lastAppliedBarcodeRef.current[index];
    if (committed != null && String(value ?? "").trim() !== committed) {
      clearCommittedBarcode(index);
    }
  };

  const allLinesSelected = lines.length > 0 && selectedLineIndexes.size === lines.length;
  const someLinesSelected = selectedLineIndexes.size > 0 && !allLinesSelected;

  const toggleLineSelected = (index, checked) => {
    setSelectedLineIndexes((prev) => {
      const next = new Set(prev);
      if (checked) next.add(index);
      else next.delete(index);
      return next;
    });
  };

  const toggleAllLinesSelected = (checked) => {
    setSelectedLineIndexes(
      checked ? new Set(Array.from({ length: lines.length }, (_, index) => index)) : new Set(),
    );
  };

  const getRowMenuItems = useCallback(
    (line, index) => {
      const row = /** @type {import("../../utils/salesInvoiceDrawerUtils").SalesInvoiceLineFormRow} */ (line);
      const hasItem = row.item_id != null && String(row.item_id).trim() !== "";
      const isFirstRow = index === 0;

      return [
        {
          key: "view-item",
          icon: <EyeOutlined />,
          label: t("lineMenuViewItem"),
          disabled: !hasItem || !canViewItem || !onViewItem,
          onClick: () => {
            if (!hasItem || !onViewItem) return;
            onViewItem(String(row.item_id));
          },
        },
        {
          key: "clear-row",
          icon: <ClearOutlined />,
          label: t("lineMenuClearRow"),
          disabled: readOnly,
          onClick: () => {
            if (readOnly) return;
            setSelectedLineIndexes((prev) => {
              if (!prev.has(index)) return prev;
              const next = new Set(prev);
              next.delete(index);
              return next;
            });
            clearCommittedBarcode(index);
            onClearLine(index);
          },
        },
        { type: "divider" },
        {
          key: "delete-row",
          icon: <DeleteOutlined />,
          danger: true,
          label: t("lineMenuDeleteRow"),
          disabled: readOnly || isFirstRow,
          title: isFirstRow ? t("lineMenuDeleteFirstDisabled") : undefined,
          onClick: () => {
            if (readOnly || isFirstRow) return;
            setSelectedLineIndexes((prev) => {
              const next = new Set();
              for (const selected of prev) {
                if (selected === index) continue;
                next.add(selected > index ? selected - 1 : selected);
              }
              return next;
            });
            const committed = lastAppliedBarcodeRef.current;
            const nextCommitted = /** @type {Record<number, string>} */ ({});
            for (const [key, value] of Object.entries(committed)) {
              const at = Number(key);
              if (at === index) continue;
              nextCommitted[at > index ? at - 1 : at] = value;
            }
            lastAppliedBarcodeRef.current = nextCommitted;
            onRemoveLine(index);
          },
        },
      ];
    },
    [canViewItem, onClearLine, onRemoveLine, onViewItem, readOnly, t],
  );

  const resolvedItemOptions = useMemo(() => {
    const byId = new Map(itemOptions.map((option) => [String(option.value), option]));
    for (const line of lines) {
      const id = line.item_id != null ? String(line.item_id) : "";
      if (!id || byId.has(id)) continue;
      byId.set(id, {
        value: id,
        label: line.item_label?.trim() || id,
        track_inventory: Boolean(line.track_inventory),
        track_lots: Boolean(line.track_lots),
        vat_percentage: line.vat_percentage != null ? Number(line.vat_percentage) : undefined,
      });
    }
    return [...byId.values()];
  }, [itemOptions, lines]);

  const columns = useMemo(
    () => [
      {
        key: "line_no",
        label: (
          <span className="item-lines-line-no-header">
            <Checkbox
              checked={allLinesSelected}
              indeterminate={someLinesSelected}
              disabled={readOnly || lines.length === 0}
              aria-label={t("lineSelectAll")}
              onChange={(event) => toggleAllLinesSelected(event.target.checked)}
            />
            <span>{t("lineNo")}</span>
          </span>
        ),
        width: "56px",
      },
      { key: "barcode", label: t("lineBarcode"), width: "minmax(180px, 0.55fr)" },
      { key: "item", label: t("lineItem"), width: "minmax(150px, 0.7fr)" },
      { key: "uom", label: t("lineUom"), width: "120px" },
      { key: "conversion", label: t("lineConversion"), width: "30px" },
      { key: "warehouse", label: t("lineWarehouse"), width: "minmax(140px, 0.7fr)" },
      { key: "lot", label: t("lineLot"), width: "80px" },
      { key: "quantity", label: t("lineQuantity"), width: "120px" },
      { key: "unit_price", label: t("lineUnitPrice"), width: "120px" },
      { key: "discount_percent", label: t("lineDiscountPercent"), width: "90px" },
      { key: "tax_rate", label: t("lineTaxRate"), width: "40px" },
      { key: "line_total", label: t("lineTotal"), width: "110px" },
    ],
    [allLinesSelected, lines.length, readOnly, someLinesSelected, t],
  );

  const handleLineBarcodeSearch = async (index, rawCode, row) => {
    const code = String(rawCode ?? "").trim();
    if (!code || readOnly || barcodePendingIndex != null) return;
    setBarcodePendingIndex(index);
    try {
      const result = /** @type {{ item?: Record<string, unknown>; item_uom?: Record<string, unknown> }} */ (
        await lookupItemByBarcode(code)
      );
      const item = result?.item;
      if (!item?.id) return;
      if (item.allow_sale === false) {
        notification.error({
          title: t("linesTitle"),
          description: tApiErrors("codes.SALES_INVOICE_ITEM_NOT_SELLABLE"),
        });
        return;
      }
      const sameItem = row.item_id != null && String(row.item_id) === String(item.id);
      const committed = lastAppliedBarcodeRef.current[index];
      const incrementQuantity = sameItem && committed != null && committed === code;
      const patch = salesInvoiceLinePatchFromBarcodeLookup(row, result, code, headerWarehouseId, {
        incrementQuantity,
      });
      if (patch) {
        onPatchLine(index, patch);
        lastAppliedBarcodeRef.current[index] = code;
      }
    } catch (err) {
      notification.error({
        title: t("linesTitle"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    } finally {
      setBarcodePendingIndex(null);
    }
  };

  return (
    <section className="item-lines-panel">
      <LinesGrid
        columns={columns}
        lines={lines}
        canAddLine={!readOnly && canAddLine}
        onAddLine={onAddLine}
        addLabel={t("panelAddRow")}
        showDeleteColumn={false}
        getRowMenuItems={getRowMenuItems}
        readOnly={readOnly}
        renderField={(line, index, columnKey) => {
          const row = /** @type {import("../../utils/salesInvoiceDrawerUtils").SalesInvoiceLineFormRow} */ (line);
          if (columnKey === "line_no") {
            return (
              <span className="item-lines-readonly-uom item-lines-line-no">
                <Checkbox
                  checked={selectedLineIndexes.has(index)}
                  disabled={readOnly}
                  aria-label={t("lineSelect", { n: index + 1 })}
                  onChange={(event) => toggleLineSelected(index, event.target.checked)}
                />
                <span>{index + 1}</span>
              </span>
            );
          }
          if (columnKey === "barcode") {
            if (readOnly) {
              return (
                <span className="item-lines-readonly-uom">
                  {row.barcode ? row.barcode : "\u2014"}
                </span>
              );
            }
            return (
              <Input
                allowClear
                className="w-full"
                placeholder={t("lineBarcodePlaceholder")}
                value={row.barcode ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  noteBarcodeFieldEdit(index, value);
                  onPatchLine(index, { barcode: value });
                }}
                onPressEnter={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void handleLineBarcodeSearch(index, event.currentTarget.value, row);
                }}
              />
            );
          }
          if (columnKey === "item") {
            return (
              <Select
                showSearch
                optionFilterProp="label"
                filterOption={salesInvoiceSelectFilter}
                className="w-full"
                placeholder={t("lineItemPlaceholder")}
                value={row.item_id != null ? String(row.item_id) : undefined}
                options={resolvedItemOptions}
                loading={itemsPending}
                disabled={readOnly}
                getPopupContainer={drawerSelectGetPopup}
                onChange={(value) => {
                  const option = resolvedItemOptions.find((item) => String(item.value) === String(value));
                  clearCommittedBarcode(index);
                  onPatchLine(index, {
                    item_id: value != null ? String(value) : undefined,
                    item_label: option?.label ?? "",
                    barcode: "",
                    item_uom_id: SI_BASE_UOM,
                    lot_id: undefined,
                    warehouse_id: option?.track_inventory ? headerWarehouseId : undefined,
                    unit_price: undefined,
                    conversion_factor: 1,
                    track_inventory: Boolean(option?.track_inventory),
                    track_lots: Boolean(option?.track_lots),
                    vat_percentage: option?.vat_percentage ?? 0,
                    tax_rate: undefined,
                    line_total: undefined,
                  });
                }}
              />
            );
          }
          if (columnKey === "uom") {
            return (
              <SalesInvoiceLineUomField
                itemId={row.item_id}
                value={row.item_uom_id}
                readOnly={readOnly}
                t={t}
                onCatalogDefaults={(option) => {
                  /** @type {Partial<import("../../utils/salesInvoiceDrawerUtils").SalesInvoiceLineFormRow>} */
                  const patch = {};
                  if (
                    (row.item_uom_id == null || row.item_uom_id === SI_BASE_UOM) &&
                    option?.value != null
                  ) {
                    patch.item_uom_id = /** @type {number} */ (option.value);
                    if (option.conversion_factor != null) {
                      patch.conversion_factor = option.conversion_factor;
                    }
                    if (typeof option.barcode === "string") {
                      patch.barcode = option.barcode;
                    }
                  } else if (!row.barcode && typeof option?.barcode === "string" && option.barcode) {
                    patch.barcode = option.barcode;
                  }
                  if (row.unit_price == null && option?.selling_price != null) {
                    patch.unit_price = Number(option.selling_price);
                  }
                  if (Object.keys(patch).length > 0) onPatchLine(index, patch);
                }}
                onChange={(value, option) => {
                  const nextBarcode = typeof option?.barcode === "string" ? option.barcode : "";
                  if (nextBarcode.trim()) {
                    lastAppliedBarcodeRef.current[index] = nextBarcode.trim();
                  } else {
                    clearCommittedBarcode(index);
                  }
                  onPatchLine(index, {
                    item_uom_id: value,
                    conversion_factor: option?.conversion_factor ?? 1,
                    unit_price:
                      option?.selling_price != null ? Number(option.selling_price) : row.unit_price,
                    barcode: nextBarcode,
                  });
                }}
              />
            );
          }
          if (columnKey === "conversion") {
            return (
              <span className="item-lines-readonly-uom">
                {row.conversion_factor != null
                  ? formatTenantNumber(row.conversion_factor, { decimals: 6, trimTrailingZeros: true })
                  : "1"}
              </span>
            );
          }
          if (columnKey === "warehouse") {
            return (
              <SalesInvoiceLineWarehouseField
                itemId={row.item_id}
                warehouseId={row.warehouse_id}
                value={row.warehouse_id}
                trackInventory={row.track_inventory}
                headerWarehouseId={headerWarehouseId}
                warehouseOptions={warehouseOptions}
                readOnly={readOnly}
                t={t}
                onChange={(value) => onPatchLine(index, { warehouse_id: value, lot_id: undefined })}
              />
            );
          }
          if (columnKey === "lot") {
            return (
              <SalesInvoiceLineLotField
                itemId={row.item_id}
                warehouseId={row.warehouse_id}
                value={row.lot_id ?? undefined}
                trackLots={row.track_lots}
                readOnly={readOnly}
                t={t}
                onChange={(value) => onPatchLine(index, { lot_id: value ?? null })}
              />
            );
          }
          if (columnKey === "unit_price") {
            return (
              <TenantNumberInput
                kind="money"
                className="w-full"
                min={0}
                placeholder={t("lineUnitPricePlaceholder")}
                value={row.unit_price}
                disabled={readOnly}
                onChange={(value) => onPatchLine(index, { unit_price: value ?? undefined })}
              />
            );
          }
          if (columnKey === "discount_percent") {
            return (
              <TenantNumberInput
                kind="quantity"
                className="w-full"
                min={0}
                max={100}
                placeholder="0"
                value={row.discount_percent}
                disabled={readOnly}
                onChange={(value) => onPatchLine(index, { discount_percent: value ?? 0 })}
              />
            );
          }
          if (columnKey === "tax_rate") {
            const option = resolvedItemOptions.find(
              (item) => row.item_id != null && String(item.value) === String(row.item_id),
            );
            const taxRate = readOnly
              ? row.tax_rate != null
                ? Number(row.tax_rate)
                : null
              : previewLineTaxRate({
                  row,
                  itemOption: option,
                  taxEnabled: taxContext.taxEnabled,
                  customerExempt: taxContext.customerExempt,
                });
            return (
              <span className="item-lines-readonly-uom">
                {taxRate != null
                  ? `${formatTenantNumber(taxRate, { decimals: 4, trimTrailingZeros: true })}%`
                  : "\u2014"}
              </span>
            );
          }
          if (columnKey === "line_total") {
            const option = resolvedItemOptions.find(
              (item) => row.item_id != null && String(item.value) === String(row.item_id),
            );
            const taxRate = readOnly
              ? row.tax_rate != null
                ? Number(row.tax_rate)
                : null
              : previewLineTaxRate({
                  row,
                  itemOption: option,
                  taxEnabled: taxContext.taxEnabled,
                  customerExempt: taxContext.customerExempt,
                });
            const live = !readOnly
              ? previewLineAmounts({
                  row,
                  taxRate,
                  pricesIncludeTax: taxContext.pricesIncludeTax,
                  settings: taxContext.settings,
                })
              : null;
            const lineTotal = readOnly ? row.line_total : live?.line_total;
            return (
              <span className="item-lines-readonly-uom">
                {lineTotal != null ? formatTenantMoney(lineTotal) : "\u2014"}
              </span>
            );
          }
          return (
            <TenantNumberInput
              kind="quantity"
              className="w-full"
              min={0.000001}
              placeholder={t("lineQtyPlaceholder")}
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
