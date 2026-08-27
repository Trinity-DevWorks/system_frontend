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
 *   dispatchDisabled: boolean;
 *   showDelete: boolean;
 *   showCancelTransfer: boolean;
 *   showLifecycleActions?: boolean;
 *   canReceive?: boolean;
 *   canCancelInTransit?: boolean;
 *   onSave: () => void;
 *   onDispatch: () => void;
 *   onReceive?: () => void;
 *   onCancelTransfer: () => void;
 *   onDelete: () => void;
 * }} props
 */
export default function StockTransferDrawerFooter({
  readOnly,
  t,
  forceClose,
  requestClose,
  submitting,
  saveDisabled,
  dispatchDisabled,
  showDelete,
  showCancelTransfer,
  showLifecycleActions = false,
  canReceive = false,
  canCancelInTransit = false,
  onSave,
  onDispatch,
  onReceive,
  onCancelTransfer,
  onDelete,
}) {
  return (
    <StockDocumentDrawerFooter
      readOnly={readOnly}
      t={t}
      forceClose={forceClose}
      requestClose={requestClose}
      submitting={submitting}
      saveDisabled={saveDisabled}
      primaryDisabled={dispatchDisabled}
      showDelete={showDelete}
      showPrimary
      primaryLabel={t("actionDispatchTransfer")}
      startExtras={
        showCancelTransfer ? (
          <Button disabled={submitting} onClick={onCancelTransfer}>
            {t("actionCancelTransfer")}
          </Button>
        ) : null
      }
      readOnlyExtras={
        showLifecycleActions ? (
          <Space wrap>
            {canCancelInTransit ? (
              <Button disabled={submitting} onClick={onCancelTransfer}>
                {t("actionCancelTransfer")}
              </Button>
            ) : null}
            {canReceive ? (
              <Button type="primary" disabled={submitting} onClick={onReceive}>
                {t("actionReceiveTransfer")}
              </Button>
            ) : null}
          </Space>
        ) : null
      }
      onSave={onSave}
      onPrimary={onDispatch}
      onDelete={onDelete}
    />
  );
}
