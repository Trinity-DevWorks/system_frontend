
"use client";

import LinesGrid from "@/shared/components/lines-grid/LinesGrid";
import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import { isPersistedEntityId } from "@/lib/entityId";
import { formatTenantMoney, formatTenantNumber } from "@/lib/tenant-format";
import { ClearOutlined, CopyOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import { App, Checkbox, Input, Select } from "antd";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import ServerSearchSelect from "@/shared/components/selects/ServerSearchSelect";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useTranslations } from "next-intl";
import { SI_BASE_UOM, isSalesInvoiceLineEmpty, mapSalesInvoiceItemOption, salesInvoiceLinePatchFromBarcodeLookup, salesInvoiceLinePatchFromItemPick, salesInvoiceSelectFilter, salesInvoiceWarehouseCodeLabel } from "../../utils/salesInvoiceDrawerUtils";
import { previewLineAmounts, previewLineTaxRate } from "../../utils/salesInvoiceTax";
import {
  useSalesInvoiceItemAvailability,
  useSalesInvoiceLineUomOptions,
} from "../../queries/useSalesInvoiceDrawerData";
import { ITEMS_LIST_QUERY_KEY, lookupItemByBarcode } from "@/features/items";
import { rememberRecentSelectorOption } from "@/lib/recentSelectorOptions";
import {
  fetchSalesInvoiceItemSelectorPage,
  SALES_INVOICE_ITEM_RECENT_KIND,
  SALES_INVOICE_ITEM_SELECTOR_PARAMS,
} from "../../api/salesInvoiceSelectors.api";
import { SiFocusStop } from "./salesInvoiceDrawerKeyboard";

/**
 * @param {{
 *   itemId?: string;
 *   value?: number | string;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   onChange: (value: number | string, option?: Record<string, unknown>) => void;
 *   onCatalogDefaults?: (option: Record<string, unknown>) => void;
 *   onCatalogReprice?: (option: Record<string, unknown>) => void;
 *   catalogReloadKey?: number;
 * }} props
 */
function SalesInvoiceLineUomField({
  itemId,
  value,
  readOnly,
  t,
  onChange,
  onCatalogDefaults,
  onCatalogReprice,
  catalogReloadKey = 0,
}) {
  const { options, pending } = useSalesInvoiceLineUomOptions({
    itemId,
    t,
    enabled: !readOnly && isPersistedEntityId(itemId),
  });
  const appliedItemRef = useRef(/** @type {string | null} */ (null));
  const appliedReloadRef = useRef(0);

  useEffect(() => {
    appliedReloadRef.current = 0;
  }, [itemId]);

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

  useEffect(() => {
    if (!catalogReloadKey || readOnly || pending) return;
    if (appliedReloadRef.current === catalogReloadKey) return;
    const current =
      options.find((row) => row.value === value || String(row.value) === String(value)) ??
      options.find((row) => row.is_default_sale) ??
      options.find((row) => row.is_base);
    appliedReloadRef.current = catalogReloadKey;
    if (current) onCatalogReprice?.(current);
  }, [catalogReloadKey, onCatalogReprice, options, pending, readOnly, value]);

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
 *   sealedLabel?: string;
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
  sealedLabel = "",
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
    const applySealed = (list) => {
      const sealed = sealedLabel.trim();
      if (!sealed || warehouseId == null) return list;
      return list.map((row) =>
        Number(row.value) === Number(warehouseId) ? { ...row, label: sealed } : row,
      );
    };
    if (!trackInventory) {
      return applySealed(warehouseOptions);
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
    return applySealed([...byId.values()]);
  }, [trackInventory, rows, warehouseOptions, headerWarehouseId, warehouseId, sealedLabel]);

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
 *   sealedLabel?: string;
 *   trackLots?: boolean;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   onChange: (value: number | undefined) => void;
 * }} props
 */
function SalesInvoiceLineLotField({ itemId, warehouseId, value, sealedLabel = "", trackLots, readOnly, t, onChange }) {
  const { rows, pending } = useSalesInvoiceItemAvailability({
    itemId,
    enabled: Boolean(trackLots) && isPersistedEntityId(itemId),
  });

  const options = useMemo(() => {
    const warehouse = rows.find((row) => Number(row.warehouse_id) === Number(warehouseId));
    const options = (warehouse?.lots ?? []).map((lot) => ({
      value: lot.id,
      label: lot.expiry_date ? `${lot.lot_number} (${lot.expiry_date})` : String(lot.lot_number ?? lot.id),
    }));
    const sealed = sealedLabel.trim();
    if (!sealed || value == null) return options;
    const index = options.findIndex((row) => Number(row.value) === Number(value));
    if (index >= 0) {
      options[index] = { ...options[index], label: sealed };
      return options;
    }
    return [{ value, label: sealed }, ...options];
  }, [rows, warehouseId, sealedLabel, value]);

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
 *   itemOptions?: { value: string; label: string; track_inventory?: boolean; track_lots?: boolean; vat_percentage?: number }[];
 *   taxContext: {
 *     taxEnabled: boolean;
 *     pricesIncludeTax: boolean;
 *     customerExempt: boolean;
 *     settings: { priceDecimalPlaces?: number; priceRoundingMode?: string };
 *   };
 *   warehouseOptions: { value: number; label: string }[];
 *   headerWarehouseId?: number;
 *   canAddLine: boolean;
 *   canViewItem?: boolean;
 *   onPatchLine: (index: number, patch: Partial<import("../../utils/salesInvoiceDrawerUtils").SalesInvoiceLineFormRow>) => void;
 *   onClearLine: (index: number) => void;
 *   onRemoveLine: (index: number) => void;
 *   onDuplicateLine?: (index: number) => void;
 *   lineKeyboardActionsRef?: import("react").MutableRefObject<{ duplicateLine?: (index: number) => void }>;
 *   onAddLine: () => void;
 *   onViewItem?: (itemId: string) => void;
 *   t: (key: string) => string;
 * }} props
 */
export default function SalesInvoiceLineEditor({
  lines,
  readOnly,
  itemOptions = [],
  taxContext = {
    taxEnabled: true,
    pricesIncludeTax: false,
    customerExempt: false,
    settings: { priceDecimalPlaces: 2, priceRoundingMode: "half_up" },
  },
  warehouseOptions,
  headerWarehouseId,
  canAddLine,
  canViewItem = true,
  onPatchLine,
  onClearLine,
  onRemoveLine,
  onDuplicateLine,
  lineKeyboardActionsRef,
  onAddLine,
  onViewItem,
  t,
}) {
  const tApiErrors = useTranslations("ApiErrors");
  const { notification } = App.useApp();
  const [barcodePendingIndex, setBarcodePendingIndex] = useState(/** @type {number | null} */ (null));
  const [selectedLineIndexes, setSelectedLineIndexes] = useState(() => new Set());
  const visibleSelectedLineIndexes = useMemo(() => {
    let stale = false;
    for (const index of selectedLineIndexes) {
      if (index >= lines.length) {
        stale = true;
        break;
      }
    }
    if (!stale) return selectedLineIndexes;
    return new Set([...selectedLineIndexes].filter((index) => index < lines.length));
  }, [selectedLineIndexes, lines.length]);
  /** Last barcode successfully applied per line — used so only a true rescan bumps qty. */
  const lastAppliedBarcodeRef = useRef(/** @type {Record<number, string>} */ ({}));

  useEffect(() => {
    const committed = lastAppliedBarcodeRef.current;
    for (const key of Object.keys(committed)) {
      const index = Number(key);
      if (index >= lines.length || isSalesInvoiceLineEmpty(lines[index])) {
        delete committed[index];
      }
    }
  }, [lines]);

  const clearCommittedBarcode = (index) => {
    delete lastAppliedBarcodeRef.current[index];
  };

  const restoreCommittedBarcode = (index, currentValue) => {
    const committed = lastAppliedBarcodeRef.current[index];
    if (!committed) return;
    if (String(currentValue ?? "").trim() !== "") return;
    onPatchLine(index, { barcode: committed });
  };

  const allLinesSelected = lines.length > 0 && visibleSelectedLineIndexes.size === lines.length;
  const someLinesSelected = visibleSelectedLineIndexes.size > 0 && !allLinesSelected;

  const toggleLineSelected = (index, checked) => {
    setSelectedLineIndexes((prev) => {
      const next = new Set(prev);
      if (checked) next.add(index);
      else next.delete(index);
      return next;
    });
  };

  const toggleAllLinesSelected = useCallback((checked) => {
    setSelectedLineIndexes(
      checked ? new Set(Array.from({ length: lines.length }, (_, index) => index)) : new Set(),
    );
  }, [lines.length]);

  const handleDuplicateLine = useCallback(
    (index) => {
      if (readOnly || !onDuplicateLine) return;
      const committed = lastAppliedBarcodeRef.current;
      const nextCommitted = /** @type {Record<number, string>} */ ({});
      for (const [key, value] of Object.entries(committed)) {
        const at = Number(key);
        if (at > index) nextCommitted[at + 1] = value;
        else nextCommitted[at] = value;
      }
      if (committed[index]) nextCommitted[index + 1] = committed[index];
      lastAppliedBarcodeRef.current = nextCommitted;
      setSelectedLineIndexes((prev) => {
        if (prev.size === 0) return prev;
        const next = new Set();
        for (const selected of prev) {
          next.add(selected > index ? selected + 1 : selected);
        }
        return next;
      });
      onDuplicateLine(index);
    },
    [onDuplicateLine, readOnly],
  );

  useEffect(() => {
    const actionsRef = lineKeyboardActionsRef;
    if (!actionsRef) return;
    const actions = actionsRef.current;
    actions.duplicateLine = handleDuplicateLine;
    return () => {
      if (actions.duplicateLine === handleDuplicateLine) {
        delete actions.duplicateLine;
      }
    };
  }, [handleDuplicateLine, lineKeyboardActionsRef]);

  const getRowMenuItems = useCallback(
    (line, index) => {
      const row = /** @type {import("../../utils/salesInvoiceDrawerUtils").SalesInvoiceLineFormRow} */ (line);
      const hasItem = row.item_id != null && String(row.item_id).trim() !== "";
      const lineEmpty = isSalesInvoiceLineEmpty(row);
      const deleteBlocked = lines.length <= 1;

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
          key: "duplicate-row",
          icon: <CopyOutlined />,
          label: t("lineMenuDuplicateRow"),
          disabled: readOnly || !onDuplicateLine,
          extra: t("lineMenuDuplicateShortcut"),
          onClick: () => handleDuplicateLine(index),
        },
        {
          key: "clear-row",
          icon: <ClearOutlined />,
          label: t("lineMenuClearRow"),
          disabled: readOnly || lineEmpty,
          onClick: () => {
            if (readOnly || lineEmpty) return;
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
          disabled: readOnly || deleteBlocked,
          title: deleteBlocked ? t("lineMenuDeleteFirstDisabled") : undefined,
          onClick: () => {
            if (readOnly || deleteBlocked) return;
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
    [
      canViewItem,
      handleDuplicateLine,
      lines.length,
      onClearLine,
      onDuplicateLine,
      onRemoveLine,
      onViewItem,
      readOnly,
      t,
    ],
  );

  const resolvedItemOptions = useMemo(() => {
    const byId = new Map();
    for (const option of itemOptions) {
      if (option?.value == null || option.value === "") continue;
      byId.set(String(option.value), option);
    }
    for (const line of lines) {
      const id = line.item_id != null ? String(line.item_id) : "";
      if (!id) continue;
      const existing = byId.get(id);
      byId.set(id, {
        value: id,
        label: line.item_label?.trim() || existing?.label || id,
        track_inventory: Boolean(line.track_inventory ?? existing?.track_inventory),
        track_lots: Boolean(line.track_lots ?? existing?.track_lots),
        vat_percentage:
          line.vat_percentage != null
            ? Number(line.vat_percentage)
            : existing?.vat_percentage,
        name: existing?.name,
        description: line.description || existing?.description,
        searchText: existing?.searchText,
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
              tabIndex={-1}
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
    [allLinesSelected, lines.length, readOnly, someLinesSelected, t, toggleAllLinesSelected],
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
        const recent = mapSalesInvoiceItemOption(item);
        if (recent) rememberRecentSelectorOption(SALES_INVOICE_ITEM_RECENT_KIND, recent);
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
                  checked={visibleSelectedLineIndexes.has(index)}
                  disabled={readOnly}
                  tabIndex={-1}
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
              <SiFocusStop field="barcode" line={index}>
                <Input
                  allowClear
                  className="w-full"
                  placeholder={t("lineBarcodePlaceholder")}
                  value={row.barcode ?? ""}
                  onChange={(event) => {
                    onPatchLine(index, { barcode: event.target.value });
                  }}
                  onBlur={(event) => restoreCommittedBarcode(index, event.currentTarget.value)}
                  onPressEnter={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const code = event.currentTarget.value;
                    if (!String(code ?? "").trim()) {
                      restoreCommittedBarcode(index, code);
                      return;
                    }
                    void handleLineBarcodeSearch(index, code, row);
                  }}
                />
              </SiFocusStop>
            );
          }
          if (columnKey === "item") {
            const selectedOption = resolvedItemOptions.find(
              (item) => row.item_id != null && String(item.value) === String(row.item_id),
            );
            return (
              <SiFocusStop field="item" line={index}>
                <ServerSearchSelect
                  className="w-full"
                  placeholder={t("lineItemPlaceholder")}
                  value={row.item_id != null ? String(row.item_id) : undefined}
                  disabled={readOnly}
                  fetchPage={fetchSalesInvoiceItemSelectorPage}
                  queryKey={ITEMS_LIST_QUERY_KEY}
                  queryParams={SALES_INVOICE_ITEM_SELECTOR_PARAMS}
                  recentKind={SALES_INVOICE_ITEM_RECENT_KIND}
                  seedOptions={selectedOption ? [selectedOption] : []}
                  recentLabel={t("selectorRecent")}
                  clearRecentLabel={t("selectorClearRecent")}
                  resultsLabel={t("selectorResults")}
                  loadMoreLabel={t("selectorLoadMore")}
                  emptyLabel={t("selectorEmpty")}
                  typeToSearchLabel={t("selectorTypeToSearch")}
                  getPopupContainer={drawerSelectGetPopup}
                  onChange={(value, option) => {
                    const picked =
                      option && typeof option === "object"
                        ? option
                        : resolvedItemOptions.find((item) => String(item.value) === String(value));
                    clearCommittedBarcode(index);
                    onPatchLine(
                      index,
                      salesInvoiceLinePatchFromItemPick(
                        value == null || value === "" ? null : picked,
                        headerWarehouseId,
                      ),
                    );
                  }}
                />
              </SiFocusStop>
            );
          }
          if (columnKey === "uom") {
            return (
              <SiFocusStop field="uom" line={index}>
                <SalesInvoiceLineUomField
                  itemId={row.item_id}
                  value={row.item_uom_id}
                  catalogReloadKey={row.catalogReloadKey ?? 0}
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
                    const nextBarcode = typeof patch.barcode === "string" ? patch.barcode.trim() : "";
                    if (nextBarcode) lastAppliedBarcodeRef.current[index] = nextBarcode;
                  }}
                  onCatalogReprice={(option) => {
                    onPatchLine(index, {
                      unit_price:
                        option?.selling_price != null ? Number(option.selling_price) : undefined,
                      discount_percent: 0,
                      tax_rate: undefined,
                      line_total: undefined,
                    });
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
              </SiFocusStop>
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
              <SiFocusStop field="warehouse" line={index}>
                <SalesInvoiceLineWarehouseField
                  itemId={row.item_id}
                  warehouseId={row.warehouse_id}
                  value={row.warehouse_id}
                  trackInventory={row.track_inventory}
                  headerWarehouseId={headerWarehouseId}
                  warehouseOptions={warehouseOptions}
                  sealedLabel={row.warehouse_label ?? ""}
                  readOnly={readOnly}
                  t={t}
                  onChange={(value) => onPatchLine(index, { warehouse_id: value, lot_id: undefined })}
                />
              </SiFocusStop>
            );
          }
          if (columnKey === "lot") {
            const lotField = (
              <SalesInvoiceLineLotField
                itemId={row.item_id}
                warehouseId={row.warehouse_id}
                value={row.lot_id ?? undefined}
                sealedLabel={row.lot_label ?? ""}
                trackLots={row.track_lots}
                readOnly={readOnly}
                t={t}
                onChange={(value) => onPatchLine(index, { lot_id: value ?? null })}
              />
            );
            if (!row.track_lots || readOnly) return lotField;
            return (
              <SiFocusStop field="lot" line={index}>
                {lotField}
              </SiFocusStop>
            );
          }
          if (columnKey === "unit_price") {
            return (
              <SiFocusStop field="unit_price" line={index}>
                <TenantNumberInput
                  kind="money"
                  className="w-full"
                  min={0}
                  placeholder={t("lineUnitPricePlaceholder")}
                  value={row.unit_price}
                  disabled={readOnly}
                  onChange={(value) => onPatchLine(index, { unit_price: value ?? undefined })}
                />
              </SiFocusStop>
            );
          }
          if (columnKey === "discount_percent") {
            return (
              <SiFocusStop field="discount" line={index}>
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
              </SiFocusStop>
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
            <SiFocusStop field="quantity" line={index}>
              <TenantNumberInput
                kind="quantity"
                className="w-full"
                min={0.000001}
                placeholder={t("lineQtyPlaceholder")}
                value={row.quantity}
                disabled={readOnly}
                onChange={(value) => onPatchLine(index, { quantity: value ?? undefined })}
              />
            </SiFocusStop>
          );
        }}
      />
    </section>
  );
}
