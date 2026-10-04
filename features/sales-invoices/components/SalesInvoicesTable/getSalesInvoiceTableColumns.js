import { DeleteOutlined, EditOutlined, EyeOutlined, MoreOutlined, RollbackOutlined } from "@ant-design/icons";
import {
  getSalesInvoiceSettlementLabel,
  getSalesInvoiceStatusLabel,
  isSalesInvoiceDraft,
  salesInvoiceSettlement,
  salesInvoiceStatusTagColor,
} from "../../utils/salesInvoiceStatuses";
import { formatTenantDate, formatTenantDateTime, formatTenantMoney } from "@/lib/tenant-format";
import dayjs from "dayjs";
import { Button, Dropdown, Tag, Typography } from "antd";

const toTime = (value) => (value ? dayjs(value).valueOf() : 0);

/**
 * @param {(key: string) => string} t
 * @param {{
 *   onView?: (record: unknown) => void;
 *   onEdit?: (record: unknown) => void;
 *   onDelete?: (record: unknown) => void;
 *   onReverse?: (record: unknown) => void;
 * }} [actions]
 */
export function getSalesInvoiceTableColumns(t, actions = {}) {
  const { onView, onEdit, onDelete, onReverse } = actions;

  return [
    {
      title: t("colNumber"),
      dataIndex: "invoice_number",
      key: "invoice_number",
      width: 140,
      ellipsis: true,
      sorter: (a, b) => String(a.invoice_number ?? "").localeCompare(String(b.invoice_number ?? "")),
      render: (value) =>
        value ? (
          <Typography.Text code className="text-xs">
            {value}
          </Typography.Text>
        ) : (
          "\u2014"
        ),
    },
    {
      title: t("colDate"),
      dataIndex: "invoice_date",
      key: "invoice_date",
      width: 120,
      sorter: (a, b) => toTime(a.invoice_date) - toTime(b.invoice_date),
      render: (value) => formatTenantDate(value) || "\u2014",
    },
    {
      title: t("colCustomer"),
      dataIndex: "customer_name",
      key: "customer_name",
      width: 200,
      ellipsis: true,
    },
    {
      title: t("colStatus"),
      dataIndex: "status",
      key: "status",
      width: 200,
      sorter: (a, b) => String(a.status ?? "").localeCompare(String(b.status ?? "")),
      render: (value, record) => {
        const settlement = salesInvoiceSettlement(value, record?.paid_total, record?.net_to_pay);
        return (
          <span className="inline-flex flex-wrap gap-1">
            <Tag color={salesInvoiceStatusTagColor(value)}>{getSalesInvoiceStatusLabel(t, value)}</Tag>
            {settlement ? (
              <Tag color={settlement === "paid" ? "success" : settlement === "partial" ? "warning" : "default"}>
                {getSalesInvoiceSettlementLabel(t, settlement)}
              </Tag>
            ) : null}
          </span>
        );
      },
    },
    {
      title: t("colGrandTotal"),
      dataIndex: "grand_total",
      key: "grand_total",
      width: 130,
      align: "right",
      sorter: (a, b) => Number(a.grand_total ?? 0) - Number(b.grand_total ?? 0),
      render: (value) => formatTenantMoney(value) || "\u2014",
    },
    {
      title: t("colPaidTotal"),
      dataIndex: "paid_total",
      key: "paid_total",
      width: 130,
      align: "right",
      sorter: (a, b) => Number(a.paid_total ?? 0) - Number(b.paid_total ?? 0),
      render: (value) => formatTenantMoney(value) || "\u2014",
    },
    {
      title: t("colNetToPay"),
      dataIndex: "net_to_pay",
      key: "net_to_pay",
      width: 130,
      align: "right",
      sorter: (a, b) => Number(a.net_to_pay ?? 0) - Number(b.net_to_pay ?? 0),
      render: (value) => formatTenantMoney(value) || "\u2014",
    },
    {
      title: t("colCreatedAt"),
      dataIndex: "created_at",
      key: "created_at",
      width: 180,
      sorter: (a, b) => toTime(a.created_at) - toTime(b.created_at),
      defaultSortOrder: "descend",
      render: (value) => formatTenantDateTime(value) || "\u2014",
    },
    {
      title: t("colActions"),
      key: "actions",
      width: 72,
      fixed: "right",
      render: (_, record) => {
        const isDraft = isSalesInvoiceDraft(record?.status);
        const items = [
          {
            key: "view",
            icon: <EyeOutlined />,
            label: t("actionView"),
            onClick: () => onView?.(record),
          },
          ...(isDraft
            ? [
                {
                  key: "edit",
                  icon: <EditOutlined />,
                  label: t("actionEdit"),
                  onClick: () => onEdit?.(record),
                },
                {
                  key: "delete",
                  icon: <DeleteOutlined />,
                  danger: true,
                  label: t("actionDelete"),
                  onClick: () => onDelete?.(record),
                },
              ]
            : []),
          ...(onReverse && record?.status === "posted"
            ? [
                {
                  key: "reverse",
                  icon: <RollbackOutlined />,
                  danger: true,
                  label: t("actionReverse"),
                  onClick: () => onReverse(record),
                },
              ]
            : []),
        ];

        return (
          <Dropdown menu={{ items }} trigger={["click"]}>
            <Button
              type="text"
              icon={<MoreOutlined />}
              aria-label={t("actionMenu")}
              onClick={(event) => event.stopPropagation()}
            />
          </Dropdown>
        );
      },
    },
  ];
}
