"use client";

import { formatTenantDateTime } from "@/lib/tenant-format";
import { postedByDisplayName } from "./SalesInvoiceDrawerHeaderMeta";
import { Button, Space } from "antd";

/**
 * @param {{
 *   t: (key: string) => string;
 *   postedBy?: unknown;
 *   postedAt?: string | null;
 * }} props
 */
function FooterPostedMeta({ t, postedBy, postedAt }) {
  return (
    <div className="sales-invoice-drawer-footer-posted">
      <span className="sales-invoice-drawer-footer-posted-item">
        <span className="sales-invoice-drawer-footer-posted-label">{t("fieldPostedBy")}</span>
        <span className="sales-invoice-drawer-footer-posted-value">
          {postedByDisplayName(postedBy) || "\u2014"}
        </span>
      </span>
      <span className="sales-invoice-drawer-footer-posted-item">
        <span className="sales-invoice-drawer-footer-posted-label">{t("fieldPostedOn")}</span>
        <span className="sales-invoice-drawer-footer-posted-value">
          {formatTenantDateTime(postedAt) || "\u2014"}
        </span>
      </span>
    </div>
  );
}

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
 *   postedBy?: unknown;
 *   postedAt?: string | null;
 *   onSave: () => void;
 *   onPost: () => void;
 *   onDelete: () => void;
 * }} props
 */
export default function SalesInvoiceDrawerFooter({
  readOnly,
  t,
  forceClose,
  requestClose,
  submitting,
  saveDisabled,
  postDisabled,
  showDelete,
  postedBy = null,
  postedAt = null,
  onSave,
  onPost,
  onDelete,
}) {
  if (readOnly) {
    return (
      <div className="flex w-full min-w-0 items-center gap-3">
        <FooterPostedMeta t={t} postedBy={postedBy} postedAt={postedAt} />
        <Button className="shrink-0" onClick={forceClose}>
          {t("drawerClose")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 items-center gap-3">
      <FooterPostedMeta t={t} postedBy={postedBy} postedAt={postedAt} />
      {showDelete ? (
        <Button className="shrink-0" danger disabled={submitting} onClick={onDelete}>
          {t("actionDelete")}
        </Button>
      ) : null}
      <Space className="ms-auto shrink-0">
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
