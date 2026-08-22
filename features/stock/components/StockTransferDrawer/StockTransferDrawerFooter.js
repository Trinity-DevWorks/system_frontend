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
  if (readOnly) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2">
        {showLifecycleActions ? (
          <Space wrap>
            {canReceive ? (
              <Button type="primary" disabled={submitting} onClick={onReceive}>
                {t("actionReceiveTransfer")}
              </Button>
            ) : null}
            {canCancelInTransit ? (
              <Button disabled={submitting} onClick={onCancelTransfer}>
                {t("actionCancelTransfer")}
              </Button>
            ) : null}
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
        {showCancelTransfer ? (
          <Button disabled={submitting} onClick={onCancelTransfer}>
            {t("actionCancelTransfer")}
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
          disabled={dispatchDisabled || submitting}
          loading={submitting}
          onClick={onDispatch}
        >
          {t("actionDispatchTransfer")}
        </Button>
      </Space>
    </div>
  );
}
