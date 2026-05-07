"use client";

import { useCallback } from "react";

/**
 * Standard close: view closes immediately; edit/create confirm if dirty.
 * @param {{
 *   readOnly: boolean;
 *   modal: { confirm: (config: object) => void };
 *   t: (key: string) => string;
 *   onClose: () => void;
 *   shouldConfirmDiscard: () => boolean;
 * }} args
 */
export function useResourceDrawerCloseFlow({ readOnly, modal, t, onClose, shouldConfirmDiscard }) {
  const forceClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const requestClose = useCallback(() => {
    if (readOnly) {
      forceClose();
      return;
    }
    if (!shouldConfirmDiscard()) {
      forceClose();
      return;
    }
    modal.confirm({
      title: t("unsavedTitle"),
      content: t("unsavedContent"),
      okText: t("unsavedLeave"),
      cancelText: t("unsavedStay"),
      okButtonProps: { danger: true },
      onOk: () => forceClose(),
    });
  }, [readOnly, shouldConfirmDiscard, forceClose, modal, t]);

  return { forceClose, requestClose };
}
