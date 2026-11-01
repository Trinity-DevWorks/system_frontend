import { formatTenantDate } from "@/lib/tenant-format";
import { documentActionsColumn, renderDocumentStatus } from "@/shared/components/tables/treasuryDocumentActions";
import { Tag, Typography } from "antd";

export function getDeliveryNoteStatusLabel(value, t) {
  return t(`status_${value ?? "draft"}`);
}

const INVOICING_COLORS = {
  invoiced: "green",
  partially_invoiced: "orange",
  not_invoiced: "default",
};

/**
 * @param {(key: string) => string} t `useTranslations("DeliveryNotes")`
 * @param {{ onView?: Function; onEdit?: Function; onDelete?: Function; onPost?: Function; onReverse?: Function }} [actions]
 * @returns {import("antd").TableProps["columns"]}
 */
export function getDeliveryNoteTableColumns(t, actions = {}) {
  return [
    {
      title: t("colNumber"),
      dataIndex: "delivery_number",
      key: "delivery_number",
      width: 200,
      render: (value) =>
        value ? (
          <Typography.Text code className="text-xs">
            {value}
          </Typography.Text>
        ) : (
          "—"
        ),
    },
    {
      title: t("colDate"),
      dataIndex: "delivery_date",
      key: "delivery_date",
      width: 120,
      render: (v) => formatTenantDate(v) || "—",
    },
    {
      title: t("colCustomer"),
      key: "customer",
      width: 220,
      ellipsis: true,
      render: (_, r) => r?.customer?.name ?? "—",
    },
    {
      title: t("colOrder"),
      key: "order",
      width: 180,
      render: (_, r) => r?.sales_order?.order_number ?? "—",
    },
    {
      title: t("colWarehouse"),
      key: "warehouse",
      width: 160,
      render: (_, r) => r?.warehouse?.name ?? "—",
    },
    {
      title: t("colStatus"),
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (v) => renderDocumentStatus(v, t),
    },
    {
      title: t("colInvoicing"),
      dataIndex: "invoicing_status",
      key: "invoicing_status",
      width: 150,
      render: (v, r) => (r?.status === "posted" ? <Tag color={INVOICING_COLORS[v] ?? "default"}>{t(`invoicing_${v}`)}</Tag> : "—"),
    },
    documentActionsColumn(t, actions),
  ];
}
