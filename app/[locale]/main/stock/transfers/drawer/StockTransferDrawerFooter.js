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
 *   postDisabled: boolean;
 *   showDelete: boolean;
 *   showCancelTransfer: boolean;
 *   onSave: () => void;
 *   onPost: () => void;
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
  postDisabled,
  showDelete,
  showCancelTransfer,
  onSave,
  onPost,
  onCancelTransfer,
  onDelete,
}) {
  if (readOnly) {
    return (
      <div className="flex justify-end">
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
          disabled={postDisabled || submitting}
          loading={submitting}
          onClick={onPost}
        >
          {t("actionPost")}
        </Button>
      </Space>
    </div>
  );
}
