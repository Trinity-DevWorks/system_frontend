"use client";

import { useEffect } from "react";

/**
 * True when an Ant Design modal (confirm / dialog) is open and interactive.
 * @returns {boolean}
 */
export function isAntModalOpen() {
  if (typeof document === "undefined") return false;
  const wraps = document.querySelectorAll(".ant-modal-wrap");
  for (const wrap of wraps) {
    if (!(wrap instanceof HTMLElement)) continue;
    const style = window.getComputedStyle(wrap);
    if (style.display === "none" || style.visibility === "hidden") continue;
    if (wrap.getAttribute("aria-hidden") === "true") continue;
    return true;
  }
  return false;
}

/**
 * Ctrl/Cmd+Enter → save (draft / primary save).
 * Ctrl/Cmd+Shift+Enter → post / primary action when provided.
 *
 * Skips while a modal is open so Enter/Esc stay with the confirm dialog.
 *
 * @param {{
 *   enabled?: boolean;
 *   submitting?: boolean;
 *   onSave?: (() => void) | null;
 *   saveDisabled?: boolean;
 *   onPost?: (() => void) | null;
 *   postDisabled?: boolean;
 * }} args
 */
export function useDrawerSubmitShortcut({
  enabled = true,
  submitting = false,
  onSave = null,
  saveDisabled = false,
  onPost = null,
  postDisabled = false,
}) {
  useEffect(() => {
    if (!enabled || submitting) return;

    const onKeyDown = (event) => {
      if (event.key !== "Enter" || event.isComposing || event.defaultPrevented) return;
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.altKey) return;
      if (isAntModalOpen()) return;

      if (event.shiftKey) {
        if (!onPost || postDisabled) return;
        event.preventDefault();
        event.stopPropagation();
        onPost();
        return;
      }

      if (!onSave || saveDisabled) return;
      event.preventDefault();
      event.stopPropagation();
      onSave();
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [enabled, submitting, onSave, saveDisabled, onPost, postDisabled]);
}

/**
 * Defaults for App.useApp().modal.confirm so Enter confirms (OK focused) and Esc cancels.
 * @param {Record<string, unknown>} config
 */
export function withConfirmKeyboard(config) {
  const { focusable, ...rest } = config ?? {};
  return {
    keyboard: true,
    focusable: {
      autoFocusButton: "ok",
      ...(focusable && typeof focusable === "object" ? focusable : {}),
    },
    ...rest,
  };
}
