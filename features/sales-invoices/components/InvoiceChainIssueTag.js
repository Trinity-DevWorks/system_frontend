"use client";

import { formatTenantDateTime } from "@/lib/tenant-format";
import { WarningOutlined } from "@ant-design/icons";
import { Tag, Tooltip } from "antd";
import { useTranslations } from "next-intl";

/**
 * Badge for an invoice the latest blockchain consistency check flagged.
 *
 * @param {{ issue?: { kind: string; checked_at: string | null } | null }} props
 */
export default function InvoiceChainIssueTag({ issue }) {
  const t = useTranslations("InvoiceChainIssues");
  if (!issue?.kind) return null;

  const checkedAt = issue.checked_at ? formatTenantDateTime(issue.checked_at) : "";
  const tooltip = (
    <>
      <div className="font-medium">{t(`kinds.${issue.kind}.label`)}</div>
      <div>{t(`kinds.${issue.kind}.hint`)}</div>
      {checkedAt ? <div className="mt-1 opacity-80">{t("checkedAt", { date: checkedAt })}</div> : null}
    </>
  );

  return (
    <Tooltip title={tooltip}>
      <Tag color="error" icon={<WarningOutlined />} className="!m-0">
        {t("badge")}
      </Tag>
    </Tooltip>
  );
}
