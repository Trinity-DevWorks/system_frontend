"use client";

import { useDrawerSubmitShortcut } from "@/shared/components/resource-drawer/useDrawerSubmitShortcut";
import { Button, Space } from "antd";

/**
 * Shared footer for inventory document drawers.
 *
 * Edit:  audit meta on the far left · Delete · Cancel, Save, primary on the right
 * View:  audit meta on the far left · Close and extras on the right
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
 *   showReverse?: boolean;
 *   showPdf?: boolean;
 *   pdfLoading?: boolean;
 *   printLoading?: boolean;
 *   saveLabel?: string;
 *   primaryLabel?: string;
 *   reverseLabel?: string;
 *   meta?: import("react").ReactNode;
 *   startExtras?: import("react").ReactNode;
 *   readOnlyStartExtras?: import("react").ReactNode;
 *   readOnlyExtras?: import("react").ReactNode;
 *   onSave?: () => void;
 *   onPrimary?: () => void;
 *   onDelete?: () => void;
 *   onReverse?: () => void;
 *   onPrint?: () => void;
 *   onDownloadPdf?: () => void;
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
  showReverse = false,
  showPdf = false,
  pdfLoading = false,
  printLoading = false,
  saveLabel,
  primaryLabel,
  reverseLabel,
  meta = null,
  startExtras = null,
  readOnlyStartExtras = null,
  readOnlyExtras = null,
  onSave,
  onPrimary,
  onDelete,
  onReverse,
  onPrint,
  onDownloadPdf,
}) {
  useDrawerSubmitShortcut({
    enabled: !readOnly,
    submitting,
    onSave,
    saveDisabled,
    onPost: showPrimary ? onPrimary : null,
    postDisabled: primaryDisabled || !showPrimary,
  });

  if (readOnly) {
    return (
      <div className="flex w-full min-w-0 flex-wrap items-center gap-3">
        {meta}
        <div className="ms-auto flex shrink-0 flex-wrap items-center gap-2">
          <Button className="shrink-0" onClick={forceClose}>
            {t("drawerClose")}
          </Button>
          {showPdf ? (
            <>
              {onPrint ? (
                <Button loading={printLoading} disabled={submitting} onClick={onPrint}>
                  {t("actionPrint")}
                </Button>
              ) : null}
              <Button loading={pdfLoading} disabled={submitting} onClick={onDownloadPdf}>
                {t("actionDownloadPdf")}
              </Button>
            </>
          ) : null}
          {showReverse ? (
            <Button danger disabled={submitting} loading={submitting} onClick={onReverse}>
              {reverseLabel ?? t("actionReverse")}
            </Button>
          ) : null}
          {readOnlyStartExtras}
          {readOnlyExtras}
        </div>
      </div>
    );
  }

  const resolvedSaveLabel = saveLabel ?? t("drawerSave");

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center gap-3">
      {meta}
      <Space wrap>
        {showDelete ? (
          <Button danger disabled={submitting} onClick={onDelete}>
            {t("actionDelete")}
          </Button>
        ) : null}
        {startExtras}
      </Space>
      <Space wrap className="ms-auto shrink-0">
        <Button onClick={requestClose} disabled={submitting}>
          {t("drawerCancel")}
        </Button>
        <Button
          disabled={saveDisabled || submitting}
          loading={submitting}
          onClick={onSave}
          title={`${resolvedSaveLabel} (Ctrl+Enter)`}
        >
          {resolvedSaveLabel}
        </Button>
        {showPrimary ? (
          <Button
            type="primary"
            disabled={primaryDisabled || submitting}
            loading={submitting}
            onClick={onPrimary}
            title={primaryLabel ? `${primaryLabel} (Ctrl+Shift+Enter)` : undefined}
          >
            {primaryLabel}
          </Button>
        ) : null}
      </Space>
    </div>
  );
}
