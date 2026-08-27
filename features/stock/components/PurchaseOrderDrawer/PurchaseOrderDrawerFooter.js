"use client";

import { Button, Space } from "antd";
import StockDocumentDrawerFooter from "../StockDocumentDrawerFooter";

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
 *   canMarkSent?: boolean;
 *   canReceive?: boolean;
 *   pdfLoading?: boolean;
 *   receiveLoading?: boolean;
 *   onSave: () => void;
 *   onConfirm: () => void;
 *   onCancelOrder: () => void;
 *   onDelete: () => void;
 *   onDownloadPdf?: () => void;
 *   onMarkSent?: () => void;
 *   onReceive?: () => void;
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
  canMarkSent = false,
  canReceive = false,
  pdfLoading = false,
  receiveLoading = false,
  onSave,
  onConfirm,
  onCancelOrder,
  onDelete,
  onDownloadPdf,
  onMarkSent,
  onReceive,
}) {
  const viewExtras =
    showSupplierActions || showCancelOrder ? (
      <Space wrap>
        {showSupplierActions ? (
          <Button loading={pdfLoading} disabled={submitting} onClick={onDownloadPdf}>
            {t("actionDownloadPoPdf")}
          </Button>
        ) : null}
        {canMarkSent ? (
          <Button disabled={submitting} onClick={onMarkSent}>
            {t("actionMarkPoSent")}
          </Button>
        ) : null}
        {showCancelOrder ? (
          <Button disabled={submitting} onClick={onCancelOrder}>
            {t("actionCancelPo")}
          </Button>
        ) : null}
        {canReceive ? (
          <Button type="primary" disabled={submitting} loading={receiveLoading} onClick={onReceive}>
            {t("actionReceiveGoods")}
          </Button>
        ) : null}
      </Space>
    ) : null;

  return (
    <StockDocumentDrawerFooter
      readOnly={readOnly}
      t={t}
      forceClose={forceClose}
      requestClose={requestClose}
      submitting={submitting}
      saveDisabled={saveDisabled}
      primaryDisabled={confirmDisabled}
      showDelete={showDelete}
      showPrimary
      primaryLabel={t("actionConfirmPo")}
      startExtras={
        showCancelOrder ? (
          <Button disabled={submitting} onClick={onCancelOrder}>
            {t("actionCancelPo")}
          </Button>
        ) : null
      }
      readOnlyExtras={viewExtras}
      onSave={onSave}
      onPrimary={onConfirm}
      onDelete={onDelete}
    />
  );
}
