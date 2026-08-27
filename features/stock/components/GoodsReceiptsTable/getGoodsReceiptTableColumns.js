import { formatTenantDate, formatTenantDateTime } from "@/lib/tenant-format";
import { getGoodsReceiptStatusLabel, isGoodsReceiptDraft } from "../../utils/goodsReceiptStatuses";
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
export function getGoodsReceiptTableColumns(t, actions = {}) {
  const { onView, onEdit, onDelete } = actions;

  return [
    {
      title: t("colGrnNumber"),
      dataIndex: "grn_number",
      key: "grn_number",
      width: 140,
      render: (value) => value || "—",
    },
    {
      title: t("colPoNumber"),
      key: "po_number",
      width: 140,
      render: (_v, record) => record?.purchase_order?.po_number ?? "—",
    },
    {
      title: t("colSupplier"),
      key: "supplier",
      width: 180,
      ellipsis: true,
      render: (_v, record) => record?.supplier?.name ?? record?.purchase_order?.supplier?.name ?? "—",
    },
    {
      title: t("colWarehouse"),
      key: "warehouse",
      width: 160,
      ellipsis: true,
      render: (_v, record) => record?.warehouse?.name ?? "—",
    },
    {
      title: t("colStatus"),
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (value) => (
        <Tag color={value === "posted" ? "green" : "default"}>{getGoodsReceiptStatusLabel(t, value)}</Tag>
      ),
    },
    {
      title: t("colReceivedDate"),
      dataIndex: "received_date",
      key: "received_date",
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
        if (onEdit && isGoodsReceiptDraft(record?.status)) {
          items.push({ key: "edit", icon: <EditOutlined />, label: t("actionEdit"), onClick: () => onEdit(record) });
        }
        if (onDelete && isGoodsReceiptDraft(record?.status)) {
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
