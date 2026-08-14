import { DeleteOutlined, EditOutlined, EyeOutlined, InboxOutlined, MoreOutlined, StopOutlined } from "@ant-design/icons";
import {
  getStockTransferStatusLabel,
  isStockTransferCancellable,
  isStockTransferDraft,
  isStockTransferReceivable,
} from "../shared/stockTransferStatuses";
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
 *   onReceive?: (record: unknown) => void;
 *   onCancel?: (record: unknown) => void;
 * }} [actions]
 */
export function getStockTransferTableColumns(t, actions = {}) {
  const { onView, onEdit, onDelete, onReceive, onCancel } = actions;

  return [
    {
      title: t("colTransferNumber"),
      dataIndex: "transfer_number",
      key: "transfer_number",
      width: 140,
      ellipsis: true,
      sorter: (a, b) => String(a.transfer_number ?? "").localeCompare(String(b.transfer_number ?? "")),
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
      title: t("colFromWarehouse"),
      dataIndex: "from_warehouse_name",
      key: "from_warehouse_name",
      width: 180,
      ellipsis: true,
    },
    {
      title: t("colToWarehouse"),
      dataIndex: "to_warehouse_name",
      key: "to_warehouse_name",
      width: 180,
      ellipsis: true,
    },
    {
      title: t("colStatus"),
      dataIndex: "status",
      key: "status",
      width: 120,
      sorter: (a, b) => String(a.status ?? "").localeCompare(String(b.status ?? "")),
      render: (value) => {
        const label = getStockTransferStatusLabel(t, value);
        const color =
          value === "received"
            ? "success"
            : value === "in_transit"
              ? "warning"
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
      title: t("colDispatchedAt"),
      dataIndex: "dispatched_at",
      key: "dispatched_at",
      width: 180,
      sorter: (a, b) => toTime(a.dispatched_at) - toTime(b.dispatched_at),
      render: (value) => formatTenantDateTime(value) || "\u2014",
    },
    {
      title: t("colReceivedAt"),
      dataIndex: "received_at",
      key: "received_at",
      width: 180,
      sorter: (a, b) => toTime(a.received_at) - toTime(b.received_at),
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
        const isDraft = isStockTransferDraft(record?.status);
        const canReceive = isStockTransferReceivable(record?.status);
        const canCancel = isStockTransferCancellable(record?.status) && !isDraft;
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
          ...(canReceive
            ? [
                {
                  key: "receive",
                  icon: <InboxOutlined />,
                  label: t("actionReceiveTransfer"),
                  onClick: () => onReceive?.(record),
                },
              ]
            : []),
          ...(canCancel
            ? [
                {
                  key: "cancel",
                  icon: <StopOutlined />,
                  label: t("actionCancelTransfer"),
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
