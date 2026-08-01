"use client";

import { Button, Space } from "antd";

/**
 * @param {{
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   forceClose: () => void;
 *   requestClose: () => void;
 *   submitting: boolean;
 *   saveDisabled: boolean;
 *   confirmDisabled: boolean;
 *   showDelete: boolean;
 *   showCancelOrder: boolean;
 *   showSupplierActions?: boolean;
 *   isSent?: boolean;
 *   pdfLoading?: boolean;
 *   onSave: () => void;
 *   onConfirm: () => void;
 *   onCancelOrder: () => void;
 *   onDelete: () => void;
 *   onDownloadPdf?: () => void;
 *   onMarkSent?: () => void;
 * }} props
 */
export default function PurchaseOrderDrawerFooter({
  readOnly,
  t,
  forceClose,
  requestClose,
  submitting,
  saveDisabled,
  confirmDisabled,
  showDelete,
  showCancelOrder,
  showSupplierActions = false,
  isSent = false,
  pdfLoading = false,
  onSave,
  onConfirm,
  onCancelOrder,
  onDelete,
  onDownloadPdf,
  onMarkSent,
}) {
  if (readOnly) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2">
        {showSupplierActions ? (
          <Space wrap>
            <Button loading={pdfLoading} disabled={submitting} onClick={onDownloadPdf}>
              {t("actionDownloadPoPdf")}
            </Button>
            <Button disabled={submitting} onClick={onMarkSent}>
              {isSent ? t("actionMarkPoSentAgain") : t("actionMarkPoSent")}
            </Button>
          </Space>
        ) : (
          <span />
        )}
        <Button onClick={forceClose}>{t("drawerClose")}</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Space wrap>
        {showDelete ? (
          <Button danger disabled={submitting} onClick={onDelete}>
            {t("actionDelete")}
          </Button>
        ) : null}
        {showCancelOrder ? (
          <Button disabled={submitting} onClick={onCancelOrder}>
            {t("actionCancelPo")}
          </Button>
        ) : null}
      </Space>

      <Space wrap>
        <Button onClick={requestClose} disabled={submitting}>
          {t("drawerCancel")}
        </Button>
        <Button disabled={saveDisabled || submitting} loading={submitting} onClick={onSave}>
          {t("drawerSave")}
        </Button>
        <Button
          type="primary"
          disabled={confirmDisabled || submitting}
          loading={submitting}
          onClick={onConfirm}
        >
          {t("actionConfirmPo")}
        </Button>
      </Space>
    </div>
  );
}
