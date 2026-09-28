/**
 * Focus the first interactive control inside a drawer body (document order).
 * Skips header/footer chrome, hidden nodes, and disabled Ant widgets.
 *
 * @param {ParentNode | null | undefined} root
 * @returns {boolean}
 */
export function focusFirstDrawerField(root) {
  if (!root || typeof document === "undefined") return false;

  const disabledWidget = [
    ".ant-select-disabled",
    ".ant-picker-disabled",
    ".ant-input-disabled",
    ".ant-input-affix-wrapper-disabled",
    ".ant-input-number-disabled",
    ".ant-btn-disabled",
    "[aria-disabled='true']",
  ].join(", ");

  /** @type {HTMLElement[]} */
  const candidates = [];

  root.querySelectorAll(
    [
      ".ant-select:not(.ant-select-disabled) .ant-select-selection-search-input",
      ".ant-select:not(.ant-select-disabled) .ant-select-selector",
      ".ant-picker:not(.ant-picker-disabled) input",
      ".ant-input-number:not(.ant-input-number-disabled) .ant-input-number-input",
      "input:not([type='hidden']):not([disabled])",
      "textarea:not([disabled])",
      "button:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(", "),
  ).forEach((node) => {
    if (node instanceof HTMLElement) candidates.push(node);
  });

  for (const node of candidates) {
    if (node.closest(".ant-drawer-header, .ant-drawer-footer, .resource-drawer-header-inner")) {
      continue;
    }
    if (node.closest(disabledWidget)) continue;
    if (node.closest(".ant-form-item-hidden, [aria-hidden='true']")) continue;
    if (node.hidden || node.getAttribute("type") === "hidden") continue;
    if (node.tabIndex < 0) continue;

    const style = window.getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") continue;

    let target = node;
    if (node.classList.contains("ant-select-selector")) {
      const inner = node.querySelector("input");
      if (inner instanceof HTMLElement && !inner.disabled) target = inner;
      else continue;
    }

    target.focus({ preventScroll: false });
    if (document.activeElement === target || target.contains(document.activeElement)) {
      return true;
    }
  }

  return false;
}
