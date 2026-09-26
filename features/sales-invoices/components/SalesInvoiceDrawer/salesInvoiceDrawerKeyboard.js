"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

export const SALES_INVOICE_HEADER_TAB_FIELDS = [
  "customer",
  "invoice_date",
  "salesman",
  "billing",
  "shipping",
  "warehouse",
  "payment_terms",
  "due_on",
  "reference_2",
  "currency",
  "exchange_rate",
  "payment_method",
];

export const SALES_INVOICE_LINE_TAB_FIELDS = [
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
 * @param {typeof SALES_INVOICE_HEADER_TAB_FIELDS | typeof SALES_INVOICE_LINE_TAB_FIELDS} fields
 */
export function salesInvoiceTabOrder(field, fields) {
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
export function SiFocusStop({ field, line, children, className }) {
  const isLine = line != null;
  const order = salesInvoiceTabOrder(
    field,
    isLine ? SALES_INVOICE_LINE_TAB_FIELDS : SALES_INVOICE_HEADER_TAB_FIELDS,
  );
  return (
    <div
      className={["min-w-0", className].filter(Boolean).join(" ")}
      data-si-focus={isLine ? "line" : "header"}
      data-si-field={field}
      data-si-order={String(order)}
      {...(isLine ? { "data-si-line": String(line) } : {})}
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
export function getSalesInvoiceStopControl(stop) {
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
export function isSalesInvoiceStopEnabled(stop) {
  if (!stop?.isConnected) return false;
  return getSalesInvoiceStopControl(stop) != null;
}

/**
 * @param {HTMLElement | null | undefined} stop
 * @returns {boolean}
 */
export function focusSalesInvoiceStop(stop) {
  const control = getSalesInvoiceStopControl(stop);
  if (!control) return false;
  control.focus({ preventScroll: false });
  return document.activeElement === control || control.contains(document.activeElement);
}

/**
 * @param {HTMLElement | null | undefined} root
 */
export function focusSalesInvoiceCustomer(root) {
  if (!root) return false;
  const stop = root.querySelector('[data-si-focus="header"][data-si-field="customer"]');
  return focusSalesInvoiceStop(stop instanceof HTMLElement ? stop : null);
}

/**
 * @param {HTMLElement | null | undefined} root
 * @param {number} lineIndex
 */
export function focusSalesInvoiceLineBarcode(root, lineIndex) {
  if (!root) return false;
  const stop = root.querySelector(
    `[data-si-focus="line"][data-si-field="barcode"][data-si-line="${lineIndex}"]`,
  );
  return focusSalesInvoiceStop(stop instanceof HTMLElement ? stop : null);
}

/**
 * @param {HTMLElement} root
 * @returns {HTMLElement[]}
 */
export function collectSalesInvoiceTabStops(root) {
  const nodes = [...root.querySelectorAll("[data-si-focus]")].filter(
    (node) => node instanceof HTMLElement,
  );
  nodes.sort((a, b) => {
    const aLine = a.dataset.siFocus === "line" ? 1 : 0;
    const bLine = b.dataset.siFocus === "line" ? 1 : 0;
    if (aLine !== bLine) return aLine - bLine;
    if (aLine === 1) {
      const lineDiff = Number(a.dataset.siLine) - Number(b.dataset.siLine);
      if (lineDiff !== 0) return lineDiff;
    }
    return Number(a.dataset.siOrder) - Number(b.dataset.siOrder);
  });
  return nodes.filter(isSalesInvoiceStopEnabled);
}

/**
 * @param {HTMLElement} root
 * @param {EventTarget | null} target
 * @returns {HTMLElement | null}
 */
export function resolveSalesInvoiceCurrentStop(root, target) {
  const fromTarget =
    target instanceof Element ? target.closest("[data-si-focus]") : null;
  if (fromTarget instanceof HTMLElement && root.contains(fromTarget)) {
    return fromTarget;
  }
  const openWidget =
    root.querySelector(".ant-select-open, .ant-picker-focused")?.closest("[data-si-focus]") ??
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
 *   customerReady?: boolean;
 *   onAddLine: () => void;
 *   isLineEmpty?: (index: number) => boolean;
 *   onClearLine?: (index: number) => void;
 *   onRemoveLine?: (index: number) => void;
 *   onDuplicateLine?: (index: number) => void;
 * }} props
 */
export function useSalesInvoiceDrawerKeyboard({
  enabled,
  rootRef,
  linesLength,
  customerReady = false,
  onAddLine,
  isLineEmpty,
  onClearLine,
  onRemoveLine,
  onDuplicateLine,
}) {
  const pendingNewRowFocusRef = useRef(false);
  const pendingFocusLineRef = useRef(/** @type {number | null} */ (null));
  const customerReadyRef = useRef(customerReady);
  const onAddLineRef = useRef(onAddLine);
  const isLineEmptyRef = useRef(isLineEmpty);
  const onClearLineRef = useRef(onClearLine);
  const onRemoveLineRef = useRef(onRemoveLine);
  const onDuplicateLineRef = useRef(onDuplicateLine);

  useEffect(() => {
    customerReadyRef.current = customerReady;
  }, [customerReady]);
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
      focusSalesInvoiceLineBarcode(root, Math.max(0, linesLength - 1));
      return;
    }
    const focusLine = pendingFocusLineRef.current;
    pendingFocusLineRef.current = null;
    if (focusLine != null) {
      focusSalesInvoiceLineBarcode(root, Math.max(0, Math.min(focusLine, linesLength - 1)));
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
        if (!customerReadyRef.current) return;
        event.preventDefault();
        // Prefer the focused line's barcode; otherwise the first line.
        const current = resolveSalesInvoiceCurrentStop(root, event.target);
        const lineIndex =
          current?.dataset.siFocus === "line" && Number.isFinite(Number(current.dataset.siLine))
            ? Number(current.dataset.siLine)
            : 0;
        focusSalesInvoiceLineBarcode(root, Math.max(0, Math.min(lineIndex, linesLength - 1)));
        return;
      }

      if (event.key === "Delete") {
        if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
        if (fieldConsumesDeleteKey(event.target)) return;
        const current = resolveSalesInvoiceCurrentStop(root, event.target);
        if (!current || current.dataset.siFocus !== "line") return;
        const lineIndex = Number(current.dataset.siLine);
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
        const current = resolveSalesInvoiceCurrentStop(root, event.target);
        if (!current || current.dataset.siFocus !== "line") return;
        const lineIndex = Number(current.dataset.siLine);
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

      const stops = collectSalesInvoiceTabStops(root);
      if (stops.length === 0) return;

      const current = resolveSalesInvoiceCurrentStop(root, event.target);
      if (!current) return;
      const index = stops.indexOf(current);
      if (index < 0) return;

      const backward = event.shiftKey;
      const isLastDiscount =
        current.dataset.siFocus === "line" &&
        current.dataset.siField === "discount" &&
        !stops.slice(index + 1).some((stop) => stop.dataset.siFocus === "line");

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
      focusSalesInvoiceStop(stops[nextIndex]);
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
