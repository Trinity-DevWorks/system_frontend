"use client";

import { Button, Space } from "antd";

/**
 * Shared footer for inventory document drawers.
 *
 * Edit:  Delete (+ extras) at the start · Cancel, Save draft, primary at the end
 * View:  extras then Close at the end
 *
 * @param {{
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   forceClose: () => void;
 *   requestClose: () => void;
 *   submitting: boolean;
 *   saveDisabled?: boolean;
 *   primaryDisabled?: boolean;
 *   showDelete?: boolean;
 *   showPrimary?: boolean;
 *   saveLabel?: string;
 *   primaryLabel?: string;
 *   startExtras?: import("react").ReactNode;
 *   readOnlyExtras?: import("react").ReactNode;
 *   onSave?: () => void;
 *   onPrimary?: () => void;
 *   onDelete?: () => void;
 * }} props
 */
export default function StockDocumentDrawerFooter({
  readOnly,
  t,
  forceClose,
  requestClose,
  submitting,
  saveDisabled = false,
  primaryDisabled = false,
  showDelete = false,
  showPrimary = false,
  saveLabel,
  primaryLabel,
  startExtras = null,
  readOnlyExtras = null,
  onSave,
  onPrimary,
  onDelete,
}) {
  if (readOnly) {
    return (
      <div className="flex w-full flex-wrap items-center justify-end gap-2">
        {readOnlyExtras}
        <Button onClick={forceClose}>{t("drawerClose")}</Button>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <Space wrap>
        {showDelete ? (
          <Button danger disabled={submitting} onClick={onDelete}>
            {t("actionDelete")}
          </Button>
        ) : null}
        {startExtras}
      </Space>
      <Space wrap className="ms-auto">
        <Button onClick={requestClose} disabled={submitting}>
          {t("drawerCancel")}
        </Button>
        <Button disabled={saveDisabled || submitting} loading={submitting} onClick={onSave}>
          {saveLabel ?? t("drawerSave")}
        </Button>
        {showPrimary ? (
          <Button
            type="primary"
            disabled={primaryDisabled || submitting}
            loading={submitting}
            onClick={onPrimary}
          >
            {primaryLabel}
          </Button>
        ) : null}
      </Space>
    </div>
  );
}
