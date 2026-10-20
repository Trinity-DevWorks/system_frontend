"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

export const PURCHASE_INVOICE_HEADER_TAB_FIELDS = [
  "supplier",
  "invoice_date",
  "goods_receipt",
  "purchase_order",
  "payment_terms",
  "due_on",
  "reference_2",
  "payment_method",
  "warehouse",
  "currency",
  "exchange_rate",
];

export const PURCHASE_INVOICE_LINE_TAB_FIELDS = [
  "barcode",
  "item",
  "uom",
  "warehouse",
  "lot",
  "quantity",
  "unit_price",
  "discount",
];

const DISABLED_WIDGET_SELECTOR = [
  ".ant-select-disabled",
  ".ant-picker-disabled",
  ".ant-input-disabled",
  ".ant-input-affix-wrapper-disabled",
  ".ant-input-number-disabled",
  ".ant-btn-disabled",
  "[aria-disabled='true']",
].join(", ");

const SKIP_EVENT_SELECTOR = [
  ".ant-modal-wrap",
  ".ant-modal-root",
  ".ant-popover",
  ".ant-picker-dropdown",
  ".ant-select-dropdown",
].join(", ");

/**
 * @param {string} field
 * @param {typeof PURCHASE_INVOICE_HEADER_TAB_FIELDS | typeof PURCHASE_INVOICE_LINE_TAB_FIELDS} fields
 */
export function purchaseInvoiceTabOrder(field, fields) {
  const index = fields.indexOf(field);
  return index < 0 ? 99 : index + 1;
}

/**
 * @param {{
 *   field: string;
 *   line?: number;
 *   children: import("react").ReactNode;
 *   className?: string;
 * }} props
 */
export function PiFocusStop({ field, line, children, className }) {
  const isLine = line != null;
  const order = purchaseInvoiceTabOrder(
    field,
    isLine ? PURCHASE_INVOICE_LINE_TAB_FIELDS : PURCHASE_INVOICE_HEADER_TAB_FIELDS,
  );
  return (
    <div
      className={["min-w-0", className].filter(Boolean).join(" ")}
      data-pi-focus={isLine ? "line" : "header"}
      data-pi-field={field}
      data-pi-order={String(order)}
      {...(isLine ? { "data-pi-line": String(line) } : {})}
    >
      {children}
    </div>
  );
}

/**
 * @param {Element} node
 */
function isVisibleControl(node) {
  if (!(node instanceof HTMLElement)) return false;
  if (node.closest(DISABLED_WIDGET_SELECTOR)) return false;
  if (node.closest(".ant-form-item-hidden, [aria-hidden='true']")) return false;
  if (node.hidden || node.getAttribute("type") === "hidden") return false;
  const style = window.getComputedStyle(node);
  return style.display !== "none" && style.visibility !== "hidden";
}

/**
 * @param {HTMLElement} stop
 * @returns {HTMLElement | null}
 */
export function getPurchaseInvoiceStopControl(stop) {
  if (!stop) return null;
  const widget =
    stop.querySelector(".ant-select:not(.ant-select-disabled) .ant-select-selection-search-input") ||
    stop.querySelector(".ant-select:not(.ant-select-disabled) .ant-select-selector") ||
    stop.querySelector(".ant-picker:not(.ant-picker-disabled) input") ||
    stop.querySelector(".ant-input-number:not(.ant-input-number-disabled) .ant-input-number-input");
  if (
    widget instanceof HTMLElement &&
    !widget.disabled &&
    !widget.closest(DISABLED_WIDGET_SELECTOR)
  ) {
    if (widget.classList.contains("ant-select-selector")) {
      const inner = widget.querySelector("input");
      if (inner instanceof HTMLElement && !inner.disabled) return inner;
    }
    return widget;
  }
  const nodes = stop.querySelectorAll(
    "input:not([type='hidden']):not([disabled]), textarea:not([disabled]), button:not([disabled])",
  );
  for (const node of nodes) {
    if (node.tabIndex < 0) continue;
    if (isVisibleControl(node)) return node;
  }
  return null;
}

/**
 * @param {HTMLElement | null | undefined} stop
 */
export function isPurchaseInvoiceStopEnabled(stop) {
  if (!stop?.isConnected) return false;
  return getPurchaseInvoiceStopControl(stop) != null;
}

/**
 * @param {HTMLElement | null | undefined} stop
 * @returns {boolean}
 */
export function focusPurchaseInvoiceStop(stop) {
  const control = getPurchaseInvoiceStopControl(stop);
  if (!control) return false;
  control.focus({ preventScroll: false });
  return document.activeElement === control || control.contains(document.activeElement);
}

/**
 * @param {HTMLElement | null | undefined} root
 */
export function focusPurchaseInvoiceSupplier(root) {
  if (!root) return false;
  const stop = root.querySelector('[data-pi-focus="header"][data-pi-field="supplier"]');
  return focusPurchaseInvoiceStop(stop instanceof HTMLElement ? stop : null);
}

/**
 * @param {HTMLElement | null | undefined} root
 * @param {number} lineIndex
 */
export function focusPurchaseInvoiceLineBarcode(root, lineIndex) {
  if (!root) return false;
  const stop = root.querySelector(
    `[data-pi-focus="line"][data-pi-field="barcode"][data-pi-line="${lineIndex}"]`,
  );
  return focusPurchaseInvoiceStop(stop instanceof HTMLElement ? stop : null);
}

/**
 * @param {HTMLElement} root
 * @returns {HTMLElement[]}
 */
export function collectPurchaseInvoiceTabStops(root) {
  const nodes = [...root.querySelectorAll("[data-pi-focus]")].filter(
    (node) => node instanceof HTMLElement,
  );
  nodes.sort((a, b) => {
    const aLine = a.dataset.piFocus === "line" ? 1 : 0;
    const bLine = b.dataset.piFocus === "line" ? 1 : 0;
    if (aLine !== bLine) return aLine - bLine;
    if (aLine === 1) {
      const lineDiff = Number(a.dataset.piLine) - Number(b.dataset.piLine);
      if (lineDiff !== 0) return lineDiff;
    }
    return Number(a.dataset.piOrder) - Number(b.dataset.piOrder);
  });
  return nodes.filter(isPurchaseInvoiceStopEnabled);
}

/**
 * @param {HTMLElement} root
 * @param {EventTarget | null} target
 * @returns {HTMLElement | null}
 */
export function resolvePurchaseInvoiceCurrentStop(root, target) {
  const fromTarget =
    target instanceof Element ? target.closest("[data-pi-focus]") : null;
  if (fromTarget instanceof HTMLElement && root.contains(fromTarget)) {
    return fromTarget;
  }
  const openWidget =
    root.querySelector(".ant-select-open, .ant-picker-focused")?.closest("[data-pi-focus]") ??
    null;
  return openWidget instanceof HTMLElement ? openWidget : null;
}

/**
 * @param {EventTarget | null} target
 * @returns {boolean} True when Delete should edit the field instead of the line.
 */
function fieldConsumesDeleteKey(target) {
  if (!(target instanceof Element)) return false;
  if (target.closest(".ant-select-dropdown, .ant-picker-dropdown")) return true;
  const editable =
    target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
      ? target
      : target.closest("input, textarea");
  if (!(editable instanceof HTMLInputElement) && !(editable instanceof HTMLTextAreaElement)) {
    return false;
  }
  if (editable.disabled || editable.readOnly) return false;
  const value = editable.value ?? "";
  const start = editable.selectionStart;
  const end = editable.selectionEnd;
  if (start == null || end == null) return value.length > 0;
  if (start !== end) return true;
  return end < value.length;
}

/**
 * @param {{
 *   enabled: boolean;
 *   rootRef: import("react").RefObject<HTMLElement | null>;
 *   linesLength: number;
 *   supplierReady?: boolean;
 *   onAddLine: () => void;
 *   isLineEmpty?: (index: number) => boolean;
 *   onClearLine?: (index: number) => void;
 *   onRemoveLine?: (index: number) => void;
 *   onDuplicateLine?: (index: number) => void;
 * }} props
 */
export function usePurchaseInvoiceDrawerKeyboard({
  enabled,
  rootRef,
  linesLength,
  supplierReady = false,
  onAddLine,
  isLineEmpty,
  onClearLine,
  onRemoveLine,
  onDuplicateLine,
}) {
  const pendingNewRowFocusRef = useRef(false);
  const pendingFocusLineRef = useRef(/** @type {number | null} */ (null));
  const supplierReadyRef = useRef(supplierReady);
  const onAddLineRef = useRef(onAddLine);
  const isLineEmptyRef = useRef(isLineEmpty);
  const onClearLineRef = useRef(onClearLine);
  const onRemoveLineRef = useRef(onRemoveLine);
  const onDuplicateLineRef = useRef(onDuplicateLine);

  useEffect(() => {
    supplierReadyRef.current = supplierReady;
  }, [supplierReady]);
  useEffect(() => {
    onAddLineRef.current = onAddLine;
  }, [onAddLine]);
  useEffect(() => {
    isLineEmptyRef.current = isLineEmpty;
  }, [isLineEmpty]);
  useEffect(() => {
    onClearLineRef.current = onClearLine;
  }, [onClearLine]);
  useEffect(() => {
    onRemoveLineRef.current = onRemoveLine;
  }, [onRemoveLine]);
  useEffect(() => {
    onDuplicateLineRef.current = onDuplicateLine;
  }, [onDuplicateLine]);

  useLayoutEffect(() => {
    if (!pendingNewRowFocusRef.current && pendingFocusLineRef.current == null) return;
    const root = rootRef.current;
    if (!root) return;
    if (pendingNewRowFocusRef.current) {
      pendingNewRowFocusRef.current = false;
      focusPurchaseInvoiceLineBarcode(root, Math.max(0, linesLength - 1));
      return;
    }
    const focusLine = pendingFocusLineRef.current;
    pendingFocusLineRef.current = null;
    if (focusLine != null) {
      focusPurchaseInvoiceLineBarcode(root, Math.max(0, Math.min(focusLine, linesLength - 1)));
    }
  }, [linesLength, rootRef]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    /** @type {HTMLElement | null} */
    let root = null;

    const onKeyDown = (event) => {
      if (event.defaultPrevented || event.isComposing) return;
      if (event.target instanceof Element && event.target.closest(SKIP_EVENT_SELECTOR)) return;
      if (!root) return;

      if (event.key === "F8") {
        if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
        if (!supplierReadyRef.current) return;
        event.preventDefault();
        // Prefer the focused line's barcode; otherwise the first line.
        const current = resolvePurchaseInvoiceCurrentStop(root, event.target);
        const lineIndex =
          current?.dataset.piFocus === "line" && Number.isFinite(Number(current.dataset.piLine))
            ? Number(current.dataset.piLine)
            : 0;
        focusPurchaseInvoiceLineBarcode(root, Math.max(0, Math.min(lineIndex, linesLength - 1)));
        return;
      }

      if (event.key === "Delete") {
        if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
        if (fieldConsumesDeleteKey(event.target)) return;
        const current = resolvePurchaseInvoiceCurrentStop(root, event.target);
        if (!current || current.dataset.piFocus !== "line") return;
        const lineIndex = Number(current.dataset.piLine);
        if (!Number.isFinite(lineIndex) || lineIndex < 0) return;
        const empty = isLineEmptyRef.current?.(lineIndex) ?? false;
        if (!empty) {
          event.preventDefault();
          onClearLineRef.current?.(lineIndex);
          return;
        }
        // Cleared rows can be removed, including the first — but keep at least one row.
        if (linesLength <= 1) return;
        event.preventDefault();
        onRemoveLineRef.current?.(lineIndex);
        pendingFocusLineRef.current = Math.max(0, lineIndex - 1);
        return;
      }

      if (
        (event.key === "d" || event.key === "D") &&
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        !event.shiftKey
      ) {
        const current = resolvePurchaseInvoiceCurrentStop(root, event.target);
        if (!current || current.dataset.piFocus !== "line") return;
        const lineIndex = Number(current.dataset.piLine);
        if (!Number.isFinite(lineIndex) || lineIndex < 0) return;
        if (!onDuplicateLineRef.current) return;
        event.preventDefault();
        onDuplicateLineRef.current(lineIndex);
        pendingFocusLineRef.current = lineIndex + 1;
        return;
      }

      if (event.key !== "Tab") return;
      if (pendingNewRowFocusRef.current) {
        event.preventDefault();
        return;
      }

      const stops = collectPurchaseInvoiceTabStops(root);
      if (stops.length === 0) return;

      const current = resolvePurchaseInvoiceCurrentStop(root, event.target);
      if (!current) return;
      const index = stops.indexOf(current);
      if (index < 0) return;

      const backward = event.shiftKey;
      const isLastDiscount =
        current.dataset.piFocus === "line" &&
        current.dataset.piField === "discount" &&
        !stops.slice(index + 1).some((stop) => stop.dataset.piFocus === "line");

      if (!backward && isLastDiscount) {
        event.preventDefault();
        pendingNewRowFocusRef.current = true;
        onAddLineRef.current();
        return;
      }

      const nextIndex = backward ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= stops.length) {
        if (backward) return;
        event.preventDefault();
        return;
      }

      event.preventDefault();
      focusPurchaseInvoiceStop(stops[nextIndex]);
    };

    const attach = () => {
      if (cancelled) return;
      root = rootRef.current;
      if (!root) {
        window.requestAnimationFrame(attach);
        return;
      }
      root.addEventListener("keydown", onKeyDown, true);
    };
    attach();

    return () => {
      cancelled = true;
      root?.removeEventListener("keydown", onKeyDown, true);
    };
  }, [enabled, rootRef, linesLength]);
}
