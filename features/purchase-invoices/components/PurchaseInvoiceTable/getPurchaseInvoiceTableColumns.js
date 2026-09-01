import { formatTenantDate, formatTenantDateTime, formatTenantNumber } from "@/lib/tenant-format";
import {
  getPurchaseInvoiceStatusLabel,
  isPurchaseInvoiceDraft,
} from "../../utils/purchaseInvoiceStatuses";
import { DeleteOutlined, EditOutlined, EyeOutlined, MoreOutlined } from "@ant-design/icons";
import { Button, Dropdown, Tag } from "antd";

/**
 * @param {(key: string) => string} t
 * @param {{
 *   onView?: (record: unknown) => void;
 *   onEdit?: (record: unknown) => void;
 *   onDelete?: (record: unknown) => void;
 * }} [actions]
 */
export function getPurchaseInvoiceTableColumns(t, actions = {}) {
  const { onView, onEdit, onDelete } = actions;

  return [
    {
      title: t("colInvoiceNumber"),
      dataIndex: "invoice_number",
      key: "invoice_number",
      width: 140,
      render: (value) => value || "—",
    },
    {
      title: t("colSupplier"),
      key: "supplier",
      width: 200,
      ellipsis: true,
      render: (_v, record) => record?.supplier?.name ?? "—",
    },
    {
      title: t("colStatus"),
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (value) => (
        <Tag color={value === "posted" ? "green" : "default"}>
          {getPurchaseInvoiceStatusLabel(t, value)}
        </Tag>
      ),
    },
    {
      title: t("colInvoiceDate"),
      dataIndex: "invoice_date",
      key: "invoice_date",
      width: 130,
      render: (value) => formatTenantDate(value) || "—",
    },
    {
      title: t("colDueDate"),
      dataIndex: "due_date",
      key: "due_date",
      width: 130,
      render: (value) => formatTenantDate(value) || "—",
    },
    {
      title: t("colGrandTotal"),
      dataIndex: "grand_total",
      key: "grand_total",
      width: 140,
      align: "right",
      render: (value, record) => {
        const amount = formatTenantNumber(value);
        const code = record?.currency?.code;
        return amount ? (code ? `${amount} ${code}` : amount) : "—";
      },
    },
    {
      title: t("colLinesCount"),
      dataIndex: "lines_count",
      key: "lines_count",
      width: 80,
      align: "right",
      render: (value) => value ?? "—",
    },
    {
      title: t("colCreatedAt"),
      dataIndex: "created_at",
      key: "created_at",
      width: 180,
      render: (value) => formatTenantDateTime(value) || "—",
    },
    {
      title: t("colActions"),
      key: "actions",
      width: 72,
      fixed: "right",
      render: (_v, record) => {
        const items = [];
        if (onView) {
          items.push({
            key: "view",
            icon: <EyeOutlined />,
            label: t("actionView"),
            onClick: () => onView(record),
          });
        }
        if (onEdit && isPurchaseInvoiceDraft(record?.status)) {
          items.push({
            key: "edit",
            icon: <EditOutlined />,
            label: t("actionEdit"),
            onClick: () => onEdit(record),
          });
        }
        if (onDelete && isPurchaseInvoiceDraft(record?.status)) {
          items.push({
            key: "delete",
            icon: <DeleteOutlined />,
            danger: true,
            label: t("actionDelete"),
            onClick: () => onDelete(record),
          });
        }
        if (items.length === 0) return null;
        return (
          <Dropdown menu={{ items }} trigger={["click"]}>
            <Button type="text" icon={<MoreOutlined />} aria-label={t("colActions")} />
          </Dropdown>
        );
      },
    },
  ];
}
