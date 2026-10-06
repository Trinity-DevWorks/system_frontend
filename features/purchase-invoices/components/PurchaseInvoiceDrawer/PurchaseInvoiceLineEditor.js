
"use client";

import LinesGrid from "@/shared/components/lines-grid/LinesGrid";
import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import { isPersistedEntityId } from "@/lib/entityId";
import { formatTenantMoney, formatTenantNumber } from "@/lib/tenant-format";
import { ClearOutlined, CopyOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import { App, Checkbox, Input, Select, Tag, Tooltip } from "antd";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import LinePriceInput from "@/shared/components/lines-grid/LinePriceInput";
import { linePriceFromPrimary, manualLinePrice, positiveRate } from "@/lib/currency/documentExchangeRate";
import ServerSearchSelect from "@/shared/components/selects/ServerSearchSelect";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useTranslations } from "next-intl";
import {
  PI_BASE_UOM,
  isPurchaseInvoiceLineEmpty,
  mapPurchaseInvoiceItemOption,
  purchaseInvoiceLinePatchFromBarcodeLookup,
  purchaseInvoiceLinePatchFromItemPick,
  purchaseInvoiceSelectFilter,
  purchaseInvoiceWarehouseCodeLabel,
  withPurchaseInvoiceLineMismatchFlags,
} from "../../utils/purchaseInvoiceDrawerUtils";
import { previewLineAmounts, previewLineTaxRate } from "@/features/sales-invoices/utils/salesInvoiceTax";
import {
  usePurchaseInvoiceItemAvailability,
  usePurchaseInvoiceLineUomOptions,
} from "../../queries/usePurchaseInvoiceDrawerData";
import { ITEMS_LIST_QUERY_KEY, lookupItemByBarcode } from "@/features/items";
import { rememberRecentSelectorOption } from "@/lib/recentSelectorOptions";
import {
  fetchPurchaseInvoiceItemSelectorPage,
  PURCHASE_INVOICE_ITEM_RECENT_KIND,
  PURCHASE_INVOICE_ITEM_SELECTOR_PARAMS,
} from "../../api/purchaseInvoiceSelectors.api";
import { PiFocusStop } from "./purchaseInvoiceDrawerKeyboard";

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
function PurchaseInvoiceLineUomField({
  itemId,
  value,
  readOnly,
  t,
  onChange,
  onCatalogDefaults,
  onCatalogReprice,
  catalogReloadKey = 0,
}) {
  // Fetch even when read-only (e.g. GRN-linked lines) so UOM labels and barcodes can hydrate.
  const { options, pending } = usePurchaseInvoiceLineUomOptions({
    itemId,
    t,
    enabled: isPersistedEntityId(itemId),
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
    if (pending || appliedItemRef.current === itemId || options.length === 0) return;
    // Prefer the line's selected UOM (GRN / saved lines) over default purchase UOM.
    const matched =
      value != null && value !== PI_BASE_UOM
        ? options.find((row) => row.value === value || String(row.value) === String(value))
        : null;
    const preferred =
      matched ??
      options.find((row) => row.is_default_purchase) ??
      options.find((row) => row.is_base);
    appliedItemRef.current = itemId;
    if (preferred) onCatalogDefaults?.(preferred);
  }, [itemId, pending, options, onCatalogDefaults, value]);

  useEffect(() => {
    if (!catalogReloadKey || readOnly || pending) return;
    if (appliedReloadRef.current === catalogReloadKey) return;
    const current =
      options.find((row) => row.value === value || String(row.value) === String(value)) ??
      options.find((row) => row.is_default_purchase) ??
      options.find((row) => row.is_base);
    appliedReloadRef.current = catalogReloadKey;
    if (current) onCatalogReprice?.(current);
  }, [catalogReloadKey, onCatalogReprice, options, pending, readOnly, value]);

  const selectValue = useMemo(() => {
    if (value != null && value !== PI_BASE_UOM) return value;
    return options.find((row) => row.is_base)?.value;
  }, [options, value]);

  return (
    <Select
      showSearch
      optionFilterProp="label"
      filterOption={purchaseInvoiceSelectFilter}
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
function PurchaseInvoiceLineWarehouseField({
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
  const { rows, pending } = usePurchaseInvoiceItemAvailability({
    itemId,
    enabled: Boolean(trackInventory) && isPersistedEntityId(itemId),
  });

  const options = useMemo(() => {
    if (!trackInventory) {
      return warehouseOptions;
    }
    /** @type {Map<number, { value: number; label: string; searchText?: string; on_hand?: unknown }>} */
    const byId = new Map();
    for (const row of rows) {
      const id = Number(row.warehouse_id);
      const code =
        purchaseInvoiceWarehouseCodeLabel(row.warehouse) ||
        String(row.warehouse?.name ?? id);
      byId.set(id, {
        value: id,
        // Keep label stable (code only). On-hand goes in optionRender so Ant Design
        // does not warn when availability loads and would otherwise change the label.
        label: code,
        searchText: `${row.warehouse?.shortcut_name ?? ""} ${row.warehouse?.name ?? ""}`,
        on_hand: row.on_hand,
      });
    }
    if (headerWarehouseId != null && !byId.has(Number(headerWarehouseId))) {
      const header = warehouseOptions.find((w) => Number(w.value) === Number(headerWarehouseId));
      if (header) {
        byId.set(Number(headerWarehouseId), {
          value: Number(header.value),
          label: String(header.label ?? header.value),
          searchText: header.searchText,
        });
      }
    }
    if (warehouseId != null && !byId.has(Number(warehouseId))) {
      const current = warehouseOptions.find((w) => Number(w.value) === Number(warehouseId));
      if (current) {
        byId.set(Number(warehouseId), {
          value: Number(current.value),
          label: String(current.label ?? current.value),
          searchText: current.searchText,
        });
      }
    }
    return [...byId.values()];
  }, [trackInventory, rows, warehouseOptions, headerWarehouseId, warehouseId]);

  const selectValue = value != null && value !== "" ? Number(value) : undefined;

  return (
    <Select
      allowClear={!trackInventory}
      showSearch
      optionFilterProp="label"
      filterOption={purchaseInvoiceSelectFilter}
      className="w-full"
      placeholder={t("lineWarehousePlaceholder")}
      value={Number.isFinite(selectValue) ? selectValue : undefined}
      options={options}
      loading={pending}
      disabled={readOnly || itemId == null}
      getPopupContainer={drawerSelectGetPopup}
      optionRender={(option) => {
        const onHand = option.data?.on_hand;
        if (onHand == null || onHand === "") return option.label;
        return `${option.label} (${formatTenantNumber(onHand, { decimals: 6, trimTrailingZeros: true })})`;
      }}
      labelRender={(props) => {
        const matched = options.find((row) => Number(row.value) === Number(props.value));
        const onHand = matched?.on_hand;
        if (onHand == null || onHand === "") return props.label;
        return `${matched.label} (${formatTenantNumber(onHand, { decimals: 6, trimTrailingZeros: true })})`;
      }}
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
function PurchaseInvoiceLineLotField({ itemId, warehouseId, value, trackLots, readOnly, t, onChange }) {
  const { rows, pending } = usePurchaseInvoiceItemAvailability({
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
 *   lines: import("../../utils/purchaseInvoiceDrawerUtils").PurchaseInvoiceLineFormRow[];
 *   readOnly: boolean;
 *   sealLocked?: boolean;
 *   itemOptions?: { value: string; label: string; track_inventory?: boolean; track_lots?: boolean; vat_percentage?: number }[];
 *   taxContext: {
 *     taxEnabled: boolean;
 *     pricesIncludeTax: boolean;
 *     supplierExempt: boolean;
 *     settings: { priceDecimalPlaces?: number; priceRoundingMode?: string };
 *   };
 *   warehouseOptions: { value: number; label: string }[];
 *   headerWarehouseId?: number;
 *   canAddLine: boolean;
 *   canViewItem?: boolean;
 *   patchLine: (index: number, patch: Partial<import("../../utils/purchaseInvoiceDrawerUtils").PurchaseInvoiceLineFormRow>) => void;
 *   onClearLine: (index: number) => void;
 *   onRemoveLine: (index: number) => void;
 *   onDuplicateLine?: (index: number) => void;
 *   lineKeyboardActionsRef?: import("react").MutableRefObject<{ duplicateLine?: (index: number) => void }>;
 *   onAddLine: () => void;
 *   onViewItem?: (itemId: string) => void;
 *   pricing?: import("@/shared/components/lines-grid/LinePriceInput").LinePricing;
 *   rateBanner?: import("react").ReactNode;
 *   t: (key: string, values?: Record<string, unknown>) => string;
 * }} props
 */
export default function PurchaseInvoiceLineEditor({
  lines,
  readOnly,
  sealLocked = false,
  pricing = { rate: 1, foreign: false, primaryCode: "", currencyCode: "" },
  rateBanner = null,
  itemOptions = [],
  taxContext = {
    taxEnabled: true,
    pricesIncludeTax: false,
    supplierExempt: false,
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
  const priceDecimals = taxContext.settings?.priceDecimalPlaces ?? 2;
  const catalogPrice = (primaryPrice) => linePriceFromPrimary(primaryPrice, pricing.rate, priceDecimals);
  const [barcodePendingIndex, setBarcodePendingIndex] = useState(/** @type {number | null} */ (null));
  const [selectedLineIndexes, setSelectedLineIndexes] = useState(() => new Set());
  /** Last barcode successfully applied per line — used so only a true rescan bumps qty. */
  const lastAppliedBarcodeRef = useRef(/** @type {Record<number, string>} */ ({}));

  // Drop selection indexes that no longer exist after lines shrink (avoid setState-in-effect).
  const activeSelectedLineIndexes = useMemo(() => {
    const next = new Set([...selectedLineIndexes].filter((index) => index < lines.length));
    return next.size === selectedLineIndexes.size ? selectedLineIndexes : next;
  }, [lines.length, selectedLineIndexes]);

  useEffect(() => {
    const committed = lastAppliedBarcodeRef.current;
    for (const key of Object.keys(committed)) {
      const index = Number(key);
      if (index >= lines.length || isPurchaseInvoiceLineEmpty(lines[index])) {
        delete committed[index];
      }
    }
  }, [lines]);

  const applyPatch = useCallback(
    (index, patch) => {
      const merged = withPurchaseInvoiceLineMismatchFlags({ ...lines[index], ...patch });
      onPatchLine(index, merged);
    },
    [lines, onPatchLine],
  );

  const clearCommittedBarcode = (index) => {
    delete lastAppliedBarcodeRef.current[index];
  };

  const restoreCommittedBarcode = (index, currentValue) => {
    const committed = lastAppliedBarcodeRef.current[index];
    if (!committed) return;
    if (String(currentValue ?? "").trim() !== "") return;
    applyPatch(index, { barcode: committed });
  };

  const allLinesSelected = lines.length > 0 && activeSelectedLineIndexes.size === lines.length;
  const someLinesSelected = activeSelectedLineIndexes.size > 0 && !allLinesSelected;

  const toggleLineSelected = (index, checked) => {
    setSelectedLineIndexes((prev) => {
      const next = new Set(prev);
      if (checked) next.add(index);
      else next.delete(index);
      return next;
    });
  };

  const toggleAllLinesSelected = useCallback(
    (checked) => {
      setSelectedLineIndexes(
        checked ? new Set(Array.from({ length: lines.length }, (_, index) => index)) : new Set(),
      );
    },
    [lines.length],
  );

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
    if (!lineKeyboardActionsRef) return;
    const actions = lineKeyboardActionsRef.current;
    actions.duplicateLine = handleDuplicateLine;
    return () => {
      if (actions.duplicateLine === handleDuplicateLine) {
        delete actions.duplicateLine;
      }
    };
  }, [handleDuplicateLine, lineKeyboardActionsRef]);

  const getRowMenuItems = useCallback(
    (line, index) => {
      const row = /** @type {import("../../utils/purchaseInvoiceDrawerUtils").PurchaseInvoiceLineFormRow} */ (line);
      const hasItem = row.item_id != null && String(row.item_id).trim() !== "";
      const lineEmpty = isPurchaseInvoiceLineEmpty(row);
      const sourceLinked =
        (row.goods_receipt_line_id != null && row.goods_receipt_line_id !== "") ||
        (row.purchase_order_line_id != null && row.purchase_order_line_id !== "");
      const deleteBlocked = lines.length <= 1 || sourceLinked || sealLocked;

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
          disabled: readOnly || sealLocked || !onDuplicateLine || sourceLinked,
          extra: t("lineMenuDuplicateShortcut"),
          onClick: () => handleDuplicateLine(index),
        },
        {
          key: "clear-row",
          icon: <ClearOutlined />,
          label: t("lineMenuClearRow"),
          disabled: readOnly || sealLocked || lineEmpty || sourceLinked,
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
      sealLocked,
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
      if (item.allow_purchase === false) {
        notification.error({
          title: t("linesTitle"),
          description: tApiErrors("codes.ITEM_PURCHASE_NOT_ALLOWED"),
        });
        return;
      }
      const sameItem = row.item_id != null && String(row.item_id) === String(item.id);
      const committed = lastAppliedBarcodeRef.current[index];
      const incrementQuantity = sameItem && committed != null && committed === code;
      const patch = purchaseInvoiceLinePatchFromBarcodeLookup(row, result, code, headerWarehouseId, {
        incrementQuantity,
        rate: pricing.rate,
        priceDecimals,
      });
      if (patch) {
        applyPatch(index, patch);
        lastAppliedBarcodeRef.current[index] = code;
        const recent = mapPurchaseInvoiceItemOption(item);
        if (recent) rememberRecentSelectorOption(PURCHASE_INVOICE_ITEM_RECENT_KIND, recent);
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
        canAddLine={!readOnly && !sealLocked && canAddLine}
        onAddLine={onAddLine}
        addLabel={t("panelAddRow")}
        showDeleteColumn={false}
        getRowMenuItems={getRowMenuItems}
        readOnly={readOnly}
        renderField={(line, index, columnKey) => {
          const row = /** @type {import("../../utils/purchaseInvoiceDrawerUtils").PurchaseInvoiceLineFormRow} */ (line);
          const grnLinked = row.goods_receipt_line_id != null && row.goods_receipt_line_id !== "";
          const poLinked = row.purchase_order_line_id != null && row.purchase_order_line_id !== "";
          const sourceLinked = grnLinked || poLinked;
          const commercialLocked = readOnly || sourceLinked || sealLocked;
          if (columnKey === "line_no") {
            return (
              <span className="item-lines-readonly-uom item-lines-line-no">
                <Checkbox
                  checked={activeSelectedLineIndexes.has(index)}
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
            const barcodeLocked = commercialLocked;
            return (
              <PiFocusStop field="barcode" line={index}>
                <Input
                  // Keep allowClear always on so the clear suffix slot is not added/removed
                  // while focused (antd warns and can drop focus). Disabled hides clear.
                  allowClear
                  className="w-full"
                  placeholder={t("lineBarcodePlaceholder")}
                  value={row.barcode ?? ""}
                  disabled={barcodeLocked}
                  onChange={(event) => {
                    applyPatch(index, { barcode: event.target.value });
                  }}
                  onBlur={(event) => restoreCommittedBarcode(index, event.currentTarget.value)}
                  onPressEnter={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (barcodeLocked) return;
                    const code = event.currentTarget.value;
                    if (!String(code ?? "").trim()) {
                      restoreCommittedBarcode(index, code);
                      return;
                    }
                    void handleLineBarcodeSearch(index, code, row);
                  }}
                />
              </PiFocusStop>
            );
          }
          if (columnKey === "item") {
            const selectedOption = resolvedItemOptions.find(
              (item) => row.item_id != null && String(item.value) === String(row.item_id),
            );
            return (
              <PiFocusStop field="item" line={index}>
                <ServerSearchSelect
                  className="w-full"
                  placeholder={t("lineItemPlaceholder")}
                  value={row.item_id != null ? String(row.item_id) : undefined}
                  disabled={commercialLocked}
                  fetchPage={fetchPurchaseInvoiceItemSelectorPage}
                  queryKey={ITEMS_LIST_QUERY_KEY}
                  queryParams={PURCHASE_INVOICE_ITEM_SELECTOR_PARAMS}
                  recentKind={PURCHASE_INVOICE_ITEM_RECENT_KIND}
                  seedOptions={
                    selectedOption
                      ? [selectedOption]
                      : row.item_id != null && row.item_label
                        ? [{ value: String(row.item_id), label: row.item_label }]
                        : []
                  }
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
                    applyPatch(
                      index,
                      purchaseInvoiceLinePatchFromItemPick(
                        value == null || value === "" ? null : picked,
                        headerWarehouseId,
                      ),
                    );
                  }}
                />
              </PiFocusStop>
            );
          }
          if (columnKey === "uom") {
            return (
              <PiFocusStop field="uom" line={index}>
                <PurchaseInvoiceLineUomField
                  itemId={row.item_id}
                  value={row.item_uom_id}
                  catalogReloadKey={row.catalogReloadKey ?? 0}
                  readOnly={commercialLocked}
                  t={t}
                  onCatalogDefaults={(option) => {
                    /** @type {Partial<import("../../utils/purchaseInvoiceDrawerUtils").PurchaseInvoiceLineFormRow>} */
                    const patch = {};
                    if (
                      (row.item_uom_id == null || row.item_uom_id === PI_BASE_UOM) &&
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
                    if (row.unit_price == null && option?.unit_cost != null) {
                      Object.assign(patch, catalogPrice(option.unit_cost));
                    }
                    if (Object.keys(patch).length > 0) applyPatch(index, patch);
                    const nextBarcode = typeof patch.barcode === "string" ? patch.barcode.trim() : "";
                    if (nextBarcode) lastAppliedBarcodeRef.current[index] = nextBarcode;
                  }}
                  onCatalogReprice={(option) => {
                    applyPatch(index, {
                      ...catalogPrice(option?.unit_cost),
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
                    applyPatch(index, {
                      item_uom_id: value,
                      conversion_factor: option?.conversion_factor ?? 1,
                      ...(option?.unit_cost != null ? catalogPrice(option.unit_cost) : {}),
                      barcode: nextBarcode,
                    });
                  }}
                />
              </PiFocusStop>
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
            if (sourceLinked) {
              const wh = warehouseOptions.find((w) => Number(w.value) === Number(row.warehouse_id));
              return (
                <span className="item-lines-readonly-uom">{wh?.label ?? row.warehouse_id ?? "\u2014"}</span>
              );
            }
            return (
              <PiFocusStop field="warehouse" line={index}>
                <PurchaseInvoiceLineWarehouseField
                  itemId={row.item_id}
                  warehouseId={row.warehouse_id}
                  value={row.warehouse_id}
                  trackInventory={row.track_inventory}
                  headerWarehouseId={headerWarehouseId}
                  warehouseOptions={warehouseOptions}
                  readOnly={readOnly}
                  t={t}
                  onChange={(value) => applyPatch(index, { warehouse_id: value, lot_id: undefined })}
                />
              </PiFocusStop>
            );
          }
          if (columnKey === "lot") {
            if (grnLinked) {
              if (!row.track_lots) {
                return <span className="item-lines-readonly-uom">{"\u2014"}</span>;
              }
              const lotLabel = row.lot_number
                ? row.expiry_date
                  ? `${row.lot_number} (${row.expiry_date})`
                  : String(row.lot_number)
                : "\u2014";
              return <span className="item-lines-readonly-uom">{lotLabel}</span>;
            }
            const lotField = (
              <PurchaseInvoiceLineLotField
                itemId={row.item_id}
                warehouseId={row.warehouse_id}
                value={row.lot_id ?? undefined}
                trackLots={row.track_lots}
                readOnly={readOnly}
                t={t}
                onChange={(value) => applyPatch(index, { lot_id: value ?? null })}
              />
            );
            if (!row.track_lots || readOnly) return lotField;
            return (
              <PiFocusStop field="lot" line={index}>
                {lotField}
              </PiFocusStop>
            );
          }
          if (columnKey === "unit_price") {
            return (
              <PiFocusStop field="unit_price" line={index}>
                <div className="flex min-w-0 items-center gap-1">
                  <LinePriceInput
                    line={row}
                    pricing={pricing}
                    className="min-w-0 flex-1"
                    placeholder={t("lineUnitPricePlaceholder")}
                    disabled={readOnly || sealLocked}
                    t={t}
                    onChange={(value) => applyPatch(index, manualLinePrice(value, pricing.rate))}
                  />
                  {row.price_mismatch ? (
                    <Tooltip
                      title={t(poLinked ? "priceMismatchWarningPo" : "priceMismatchWarning", {
                        grn: formatTenantMoney(
                          linePriceFromPrimary(
                            poLinked ? row.po_unit_price : row.grn_unit_cost,
                            positiveRate(row.price_rate) ?? pricing.rate ?? 1,
                            priceDecimals,
                            "document",
                          ).unit_price,
                        ) || "\u2014",
                      })}
                    >
                      <Tag color="warning" className="!m-0 shrink-0">
                        !
                      </Tag>
                    </Tooltip>
                  ) : null}
                </div>
              </PiFocusStop>
            );
          }
          if (columnKey === "discount_percent") {
            return (
              <PiFocusStop field="discount" line={index}>
                <TenantNumberInput
                  kind="quantity"
                  className="w-full"
                  min={0}
                  max={100}
                  placeholder="0"
                  value={row.discount_percent}
                  disabled={readOnly || sealLocked}
                  onChange={(value) => applyPatch(index, { discount_percent: value ?? 0 })}
                />
              </PiFocusStop>
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
                  customerExempt: taxContext.supplierExempt,
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
                  customerExempt: taxContext.supplierExempt,
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
            <PiFocusStop field="quantity" line={index}>
              <div className="flex min-w-0 items-center gap-1">
                <TenantNumberInput
                  kind="quantity"
                  className="min-w-0 flex-1"
                  min={0.000001}
                  placeholder={t("lineQtyPlaceholder")}
                  value={row.quantity}
                  disabled={readOnly || sealLocked}
                  onChange={(value) => applyPatch(index, { quantity: value ?? undefined })}
                />
                {row.qty_mismatch ? (
                  <Tooltip
                    title={t(poLinked ? "qtyMismatchWarningPo" : "qtyMismatchWarning", {
                      grn: (poLinked ? row.po_quantity : row.grn_quantity) ?? "\u2014",
                    })}
                  >
                    <Tag color="warning" className="!m-0 shrink-0">
                      !
                    </Tag>
                  </Tooltip>
                ) : null}
              </div>
            </PiFocusStop>
          );
        }}
      />
      {rateBanner}
    </section>
  );
}
