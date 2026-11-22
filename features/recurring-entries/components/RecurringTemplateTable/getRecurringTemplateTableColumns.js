import { formatTenantDate, formatTenantMoneyWithSymbol } from "@/lib/tenant-format";
import { Button, Dropdown, Tag } from "antd";
import { MoreOutlined } from "@ant-design/icons";
import { frequencyText } from "../../utils/recurringTemplateDrawerUtils";

const STATUS_COLOR = { active: "green", paused: "gold", completed: "blue", cancelled: "default" };

/** @param {(key: string, values?: Record<string, unknown>) => string} t @param {Record<string, Function | undefined>} actions */
export function getRecurringTemplateTableColumns(t, actions) {
  return [
    { title: t("colNumber"), dataIndex: "template_number", width: 150 },
    { title: t("colName"), dataIndex: "name", ellipsis: true },
    {
      title: t("colType"),
      dataIndex: "document_type",
      width: 150,
      render: (value) => <Tag>{t(`type_${value}`)}</Tag>,
    },
    {
      title: t("colFrequency"),
      key: "frequency",
      width: 220,
      render: (_, record) => frequencyText(t, record),
    },
    {
      title: t("colNextRun"),
      dataIndex: "next_run_date",
      width: 130,
      render: (value) => {
        if (!value) return "—";
        const overdue = value < new Date().toISOString().slice(0, 10);
        return <span className={overdue ? "text-red-600" : undefined}>{formatTenantDate(value)}</span>;
      },
    },
    { title: t("colLastRun"), dataIndex: "last_run_date", width: 130, render: (value) => (value ? formatTenantDate(value) : "—") },
    {
      title: t("colOccurrences"),
      key: "occurrences",
      width: 110,
      render: (_, record) => (record.max_occurrences ? `${record.occurrences_count} / ${record.max_occurrences}` : String(record.occurrences_count ?? 0)),
    },
    {
      title: t("colTotal"),
      dataIndex: "total",
      width: 140,
      align: "right",
      render: (value, record) => formatTenantMoneyWithSymbol(value, record.currency?.symbol || record.currency?.code || ""),
    },
    {
      title: t("colStatus"),
      dataIndex: "status",
      width: 130,
      render: (value, record) => (
        <Tag color={record.last_error_code ? "red" : STATUS_COLOR[value] ?? "default"}>{t(`status_${value}`)}</Tag>
      ),
    },
    {
      title: t("colActions"),
      key: "actions",
      width: 70,
      render: (_, record) => {
        const items = [
          actions.onView && { key: "view", label: t("actionView"), onClick: () => actions.onView(record) },
          actions.onEdit && record.status !== "completed" && record.status !== "cancelled" && { key: "edit", label: t("actionEdit"), onClick: () => actions.onEdit(record) },
          actions.onRun && record.status === "active" && { key: "run", label: t("actionRun"), onClick: () => actions.onRun(record) },
          actions.onPause && record.status === "active" && { key: "pause", label: t("actionPause"), onClick: () => actions.onPause(record) },
          actions.onResume && record.status === "paused" && { key: "resume", label: t("actionResume"), onClick: () => actions.onResume(record) },
          actions.onSkip && record.status === "active" && { key: "skip", label: t("actionSkip"), onClick: () => actions.onSkip(record) },
          actions.onCancel && record.status !== "completed" && record.status !== "cancelled" && { key: "cancel", label: t("actionCancelTemplate"), danger: true, onClick: () => actions.onCancel(record) },
          actions.onDelete && { key: "delete", label: t("actionDelete"), danger: true, onClick: () => actions.onDelete(record) },
        ].filter(Boolean);
        if (!items.length) return null;
        return (
          <Dropdown menu={{ items }} trigger={["click"]}>
            <Button type="text" icon={<MoreOutlined />} aria-label={t("actionMenu")} />
          </Dropdown>
        );
      },
    },
  ];
}
