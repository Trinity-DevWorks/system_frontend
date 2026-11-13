import { formatTenantDate } from "@/lib/tenant-format";
import { Button, Tag } from "antd";

const COLOR = { generated: "gold", posted: "green", failed: "red", skipped: "default" };

/** @param {(key: string) => string} t @param {(key: string) => string} tApiErrors @param {{ onOpenDocument?: Function; onRetry?: Function }} actions */
export function getRecurringRunTableColumns(t, tApiErrors, actions) {
  return [
    { title: t("colDate"), dataIndex: "scheduled_date", width: 130, render: (value) => formatTenantDate(value) },
    {
      title: t("colTemplate"),
      key: "template",
      render: (_, record) => record.template?.template_number ? `${record.template.template_number} — ${record.template.name ?? ""}` : record.template?.name,
    },
    { title: t("colStatus"), dataIndex: "status", width: 120, render: (value) => <Tag color={COLOR[value] ?? "default"}>{t(`run_${value}`)}</Tag> },
    {
      title: t("colDocument"),
      dataIndex: "document_number",
      width: 160,
      render: (value, record) =>
        record.document_id && actions.onOpenDocument ? (
          <Button type="link" className="px-0" onClick={() => actions.onOpenDocument(record)}>
            {value || t("openDraft")}
          </Button>
        ) : (
          value || "—"
        ),
    },
    {
      title: t("colError"),
      dataIndex: "error_code",
      ellipsis: true,
      render: (value) => (value ? (tApiErrors.has?.(`codes.${value}`) ? tApiErrors(`codes.${value}`) : value) : "—"),
    },
    {
      title: t("colTriggeredBy"),
      key: "triggered_by",
      width: 160,
      render: (_, record) => record.triggered_by?.name ?? t("triggeredBySystem"),
    },
    {
      title: t("colActions"),
      key: "actions",
      width: 90,
      render: (_, record) =>
        record.status === "failed" && actions.onRetry ? (
          <Button size="small" onClick={() => actions.onRetry(record)}>
            {t("actionRetry")}
          </Button>
        ) : null,
    },
  ];
}
