import { DeleteOutlined, EditOutlined, EyeOutlined, FilePdfOutlined, MailOutlined, MoreOutlined, StopOutlined } from "@ant-design/icons";
import {
  getPurchaseOrderStatusLabel,
  isPurchaseOrderCancellable,
  isPurchaseOrderConfirmed,
  isPurchaseOrderPrintable,
} from "../shared/purchaseOrderStatuses";
import { formatTenantDateTime } from "@/lib/tenant-format";
import dayjs from "dayjs";
import { Button, Dropdown, Tag, Typography } from "antd";

const toTime = (value) => (value ? dayjs(value).valueOf() : 0);

/**
 * @param {(key: string) => string} t
 * @param {{
 *   onView?: (record: unknown) => void;
 *   onEdit?: (record: unknown) => void;
 *   onDelete?: (record: unknown) => void;
 *   onCancel?: (record: unknown) => void;
 *   onDownloadPdf?: (record: unknown) => void;
 *   onMarkSent?: (record: unknown) => void;
 * }} [actions]
 */
export function getPurchaseOrderTableColumns(t, actions = {}) {
  const { onView, onEdit, onDelete, onCancel, onDownloadPdf, onMarkSent } = actions;

  return [
    {
      title: t("colPoNumber"),
      dataIndex: "po_number",
      key: "po_number",
      width: 130,
      ellipsis: true,
      sorter: (a, b) => String(a.po_number ?? "").localeCompare(String(b.po_number ?? "")),
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
      title: t("colSupplier"),
      dataIndex: "supplier_name",
      key: "supplier_name",
      width: 180,
      ellipsis: true,
    },
    {
      title: t("colWarehouse"),
      dataIndex: "warehouse_name",
      key: "warehouse_name",
      width: 160,
      ellipsis: true,
    },
    {
      title: t("colOrderDate"),
      dataIndex: "order_date",
      key: "order_date",
      width: 120,
      sorter: (a, b) => toTime(a.order_date) - toTime(b.order_date),
      render: (value) => value ?? "\u2014",
    },
    {
      title: t("colStatus"),
      dataIndex: "status",
      key: "status",
      width: 120,
      sorter: (a, b) => String(a.status ?? "").localeCompare(String(b.status ?? "")),
      render: (value) => {
        const label = getPurchaseOrderStatusLabel(t, value);
        const color =
          value === "confirmed"
            ? "success"
            : value === "sent"
              ? "cyan"
              : value === "cancelled"
                ? "default"
                : "processing";
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: t("colLinesCount"),
      dataIndex: "lines_count",
      key: "lines_count",
      width: 88,
      align: "right",
      sorter: (a, b) => Number(a.lines_count ?? 0) - Number(b.lines_count ?? 0),
    },
    {
      title: t("colConfirmedAt"),
      dataIndex: "confirmed_at",
      key: "confirmed_at",
      width: 180,
      sorter: (a, b) => toTime(a.confirmed_at) - toTime(b.confirmed_at),
      render: (value) => formatTenantDateTime(value) || "\u2014",
    },
    {
      title: t("colSentAt"),
      dataIndex: "sent_at",
      key: "sent_at",
      width: 180,
      sorter: (a, b) => toTime(a.sent_at) - toTime(b.sent_at),
      render: (value) => formatTenantDateTime(value) || "\u2014",
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
        const isDraft = record?.status === "draft";
        const canCancel = isPurchaseOrderCancellable(record?.status);
        const isConfirmed = isPurchaseOrderConfirmed(record?.status);
        const isPrintable = isPurchaseOrderPrintable(record?.status);
        const items = [
          {
            key: "view",
            icon: <EyeOutlined />,
            label: t("actionView"),
            onClick: () => onView?.(record),
          },
          ...(isPrintable
            ? [
                {
                  key: "pdf",
                  icon: <FilePdfOutlined />,
                  label: t("actionDownloadPoPdf"),
                  onClick: () => onDownloadPdf?.(record),
                },
              ]
            : []),
          ...(isConfirmed
            ? [
                {
                  key: "mark-sent",
                  icon: <MailOutlined />,
                  label: t("actionMarkPoSent"),
                  onClick: () => onMarkSent?.(record),
                },
              ]
            : []),
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
          ...(canCancel && !isDraft
            ? [
                {
                  key: "cancel",
                  icon: <StopOutlined />,
                  label: t("actionCancelPo"),
                  onClick: () => onCancel?.(record),
                },
              ]
            : []),
        ];

        return (
          <Dropdown menu={{ items }} trigger={["click"]}>
            <Button type="text" icon={<MoreOutlined />} aria-label={t("actionMenu")} />
          </Dropdown>
        );
      },
    },
  ];
}
