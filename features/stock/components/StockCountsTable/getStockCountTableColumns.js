import { formatTenantDate, formatTenantDateTime } from "@/lib/tenant-format";
import { getStockCountStatusLabel, isStockCountDraft } from "../../utils/stockCountStatuses";
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
export function getStockCountTableColumns(t, actions = {}) {
  const { onView, onEdit, onDelete } = actions;

  return [
    {
      title: t("colCntNumber"),
      dataIndex: "cnt_number",
      key: "cnt_number",
      width: 140,
      render: (value) => value || "—",
    },
    {
      title: t("colWarehouse"),
      key: "warehouse",
      width: 180,
      ellipsis: true,
      render: (_v, record) => record?.warehouse?.name ?? "—",
    },
    {
      title: t("colStatus"),
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (value) => (
        <Tag color={value === "posted" ? "green" : "default"}>{getStockCountStatusLabel(t, value)}</Tag>
      ),
    },
    {
      title: t("colCountDate"),
      dataIndex: "count_date",
      key: "count_date",
      width: 130,
      render: (value) => formatTenantDate(value) || "—",
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
          items.push({ key: "view", icon: <EyeOutlined />, label: t("actionView"), onClick: () => onView(record) });
        }
        if (onEdit && isStockCountDraft(record?.status)) {
          items.push({ key: "edit", icon: <EditOutlined />, label: t("actionEdit"), onClick: () => onEdit(record) });
        }
        if (onDelete && isStockCountDraft(record?.status)) {
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
            <Button type="text" icon={<MoreOutlined />} aria-label={t("actionMenu")} />
          </Dropdown>
        );
      },
    },
  ];
}
