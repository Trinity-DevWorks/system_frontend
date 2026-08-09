"use client";

import { formatTenantDateTime } from "@/lib/tenant-format";
import { Descriptions, Drawer, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { getAuditEventLabel, getAuditableTypeLabel } from "./auditLogLabels";

/**
 * @param {unknown} value
 * @returns {string}
 */
function formatJsonBlock(value) {
  if (value == null) return "";
  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * @param {{
 *   open: boolean;
 *   record: Record<string, unknown> | null;
 *   onClose: () => void;
 * }} props
 */
export default function AuditLogDetailDrawer({ open, record, onClose }) {
  const t = useTranslations("AuditLog");

  const oldText = useMemo(() => formatJsonBlock(record?.old_values), [record?.old_values]);
  const newText = useMemo(() => formatJsonBlock(record?.new_values), [record?.new_values]);

  const userLabel = useMemo(() => {
    const name = record?.user?.name;
    const email = record?.user?.email;
    if (typeof name === "string" && name.trim() && typeof email === "string" && email.trim()) {
      return `${name} (${email})`;
    }
    if (typeof name === "string" && name.trim()) return name;
    if (typeof email === "string" && email.trim()) return email;
    return "\u2014";
  }, [record?.user]);

  return (
    <Drawer
      title={t("drawerTitleView")}
      open={open}
      onClose={onClose}
      size={720}
      destroyOnHidden
    >
      {!record ? null : (
        <div className="flex flex-col gap-4">
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label={t("colCreatedAt")}>
              {formatTenantDateTime(record.created_at) || "\u2014"}
            </Descriptions.Item>
            <Descriptions.Item label={t("colEvent")}>
              {getAuditEventLabel(t, /** @type {string} */ (record.event))}
            </Descriptions.Item>
            <Descriptions.Item label={t("colUser")}>{userLabel}</Descriptions.Item>
            <Descriptions.Item label={t("colAuditableType")}>
              {getAuditableTypeLabel(t, record?.auditable?.type)}
            </Descriptions.Item>
            <Descriptions.Item label={t("colAuditableId")}>
              {record?.auditable?.id != null ? String(record.auditable.id) : "\u2014"}
            </Descriptions.Item>
            <Descriptions.Item label={t("colIp")}>
              {typeof record.ip_address === "string" && record.ip_address.trim()
                ? record.ip_address
                : "\u2014"}
            </Descriptions.Item>
            <Descriptions.Item label={t("colUrl")}>
              {typeof record.url === "string" && record.url.trim() ? record.url : "\u2014"}
            </Descriptions.Item>
            <Descriptions.Item label={t("colTags")}>
              {typeof record.tags === "string" && record.tags.trim() ? record.tags : "\u2014"}
            </Descriptions.Item>
            <Descriptions.Item label={t("colUserAgent")}>
              {typeof record.user_agent === "string" && record.user_agent.trim()
                ? record.user_agent
                : "\u2014"}
            </Descriptions.Item>
          </Descriptions>

          <div>
            <Typography.Title level={5} className="!mb-2">
              {t("oldValues")}
            </Typography.Title>
            {oldText ? (
              <pre className="max-h-64 overflow-auto rounded border border-neutral-200 bg-neutral-50 p-3 text-xs dark:border-neutral-700 dark:bg-neutral-900">
                {oldText}
              </pre>
            ) : (
              <Typography.Text type="secondary">{t("noDiffValues")}</Typography.Text>
            )}
          </div>

          <div>
            <Typography.Title level={5} className="!mb-2">
              {t("newValues")}
            </Typography.Title>
            {newText ? (
              <pre className="max-h-64 overflow-auto rounded border border-neutral-200 bg-neutral-50 p-3 text-xs dark:border-neutral-700 dark:bg-neutral-900">
                {newText}
              </pre>
            ) : (
              <Typography.Text type="secondary">{t("noDiffValues")}</Typography.Text>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}
