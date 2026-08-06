import { DeleteOutlined, EditOutlined, EyeOutlined, MoreOutlined } from "@ant-design/icons";
import { getStockTransferStatusLabel } from "../shared/stockTransferStatuses";
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
 * }} [actions]
 */
export function getStockTransferTableColumns(t, actions = {}) {
  const { onView, onEdit, onDelete } = actions;

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
          value === "posted" ? "success" : value === "cancelled" ? "default" : "processing";
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
      title: t("colPostedAt"),
      dataIndex: "posted_at",
      key: "posted_at",
      width: 200,
      sorter: (a, b) => toTime(a.posted_at) - toTime(b.posted_at),
      render: (value) => (formatTenantDateTime(value) || "\u2014"),
    },
    {
      title: t("colCreatedAt"),
      dataIndex: "created_at",
      key: "created_at",
      width: 200,
      sorter: (a, b) => toTime(a.created_at) - toTime(b.created_at),
      defaultSortOrder: "descend",
      render: (value) => (formatTenantDateTime(value) || "\u2014"),
    },
    {
      title: t("colActions"),
      key: "actions",
      width: 72,
      fixed: "right",
      render: (_, record) => {
        const isDraft = record?.status === "draft";
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
