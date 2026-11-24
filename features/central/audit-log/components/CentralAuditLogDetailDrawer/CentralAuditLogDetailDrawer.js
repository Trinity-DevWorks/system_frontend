"use client";

import { useDrawerHostPresence } from "@/lib/drawer/DrawerHostPresence";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { formatTenantDateTime } from "@/lib/tenant-format";
import { useQuery } from "@tanstack/react-query";
import { Descriptions, Drawer, Spin, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { fetchCentralAudit } from "../../api/audits.api";
import { centralAuditLogRecordQueryKey } from "../../queries/auditsQueryKeys";
import { getCentralAuditEventLabel, getCentralAuditableTypeLabel } from "../../utils/auditLogLabels";

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

/** @param {unknown} value */
function textOrDash(value) {
  return typeof value === "string" && value.trim() ? value : "\u2014";
}

/**
 * @param {{
 *   open: boolean;
 *   record: Record<string, unknown> | null;
 *   auditId?: string | number | null;
 *   onClose: () => void;
 * }} props
 */
export default function CentralAuditLogDetailDrawer({ open, record: seedRecord, auditId = null, onClose }) {
  const t = useTranslations("CentralAuditLog");
  const hostPresence = useDrawerHostPresence();

  const detailEnabled = open && auditId != null && seedRecord == null;
  const detailQuery = useQuery({
    queryKey: centralAuditLogRecordQueryKey(auditId),
    queryFn: () => fetchCentralAudit(/** @type {string | number} */ (auditId)),
    enabled: detailEnabled,
    staleTime: QUERY_STALE_TIME.default,
  });

  const record = seedRecord ?? detailQuery.data ?? null;

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
      afterOpenChange={hostPresence?.afterOpenChange}
      size={720}
      destroyOnHidden
    >
      {detailEnabled && detailQuery.isPending && !record ? (
        <div className="flex min-h-40 items-center justify-center">
          <Spin />
        </div>
      ) : !record ? null : (
        <div className="flex flex-col gap-4">
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label={t("colCreatedAt")}>
              {formatTenantDateTime(record.created_at) || "\u2014"}
            </Descriptions.Item>
            <Descriptions.Item label={t("colEvent")}>
              {getCentralAuditEventLabel(t, /** @type {string} */ (record.event))}
            </Descriptions.Item>
            <Descriptions.Item label={t("colUser")}>{userLabel}</Descriptions.Item>
            <Descriptions.Item label={t("colAuditableType")}>
              {getCentralAuditableTypeLabel(t, record?.auditable?.type)}
            </Descriptions.Item>
            <Descriptions.Item label={t("colAuditableId")}>
              {record?.auditable?.id != null ? String(record.auditable.id) : "\u2014"}
            </Descriptions.Item>
            <Descriptions.Item label={t("colIp")}>{textOrDash(record.ip_address)}</Descriptions.Item>
            <Descriptions.Item label={t("colUrl")}>{textOrDash(record.url)}</Descriptions.Item>
            <Descriptions.Item label={t("colTags")}>{textOrDash(record.tags)}</Descriptions.Item>
            <Descriptions.Item label={t("colUserAgent")}>{textOrDash(record.user_agent)}</Descriptions.Item>
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
