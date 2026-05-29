import ItemPrimaryImageCell from "@/components/items/ItemPrimaryImageCell";
import { renderActiveInactiveStatus } from "@/components/tables/ActiveStatusBadge";
import { DeleteOutlined, EditOutlined, EyeOutlined, MoreOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Button, Dropdown, Tag, Typography } from "antd";
import { getItemTypeLabel } from "@/services/itemTypesApi";

const toTime = (value) => (value ? dayjs(value).valueOf() : 0);

export function getItemStatusLabel(value, t) {
  return value ? t("statusActive") : t("statusInactive");
}

/**
 * @param {(key: string) => string} t
 * @param {{ onEdit?: (r: unknown) => void; onView?: (r: unknown) => void; onDelete?: (r: unknown) => void }} [actions]
 */
export function getItemTableColumns(t, actions = {}) {
  const { onEdit, onView, onDelete } = actions;
  return [
    { title: t("colId"), dataIndex: "id", key: "id", width: 56, sorter: (a, b) => a.id - b.id },
    {
      title: t("colImage"),
      key: "primary_image",
      width: 56,
      align: "center",
      onHeaderCell: () => ({ className: "items-table-image-cell" }),
      onCell: () => ({ className: "items-table-image-cell" }),
      render: (_v, r) => <ItemPrimaryImageCell itemId={r.id} primaryImage={r.primary_image} />,
    },
    {
      title: t("colSku"),
      dataIndex: "sku",
      key: "sku",
      width: 110,
      render: (v) =>
        v ? (
          <Typography.Text code className="text-xs">
            {v}
          </Typography.Text>
        ) : (
          "—"
        ),
    },
    { title: t("colName"), dataIndex: "name", key: "name", width: 180, ellipsis: true },
    {
      title: t("colType"),
      key: "item_type",
      width: 110,
      render: (_v, r) => {
        const label = getItemTypeLabel(r.item_type) || "—";
        const code = r.item_type?.code;
        return code ? <Tag>{label}</Tag> : label;
      },
    },
    {
      title: t("colCategory"),
      key: "category",
      width: 130,
      ellipsis: true,
      render: (_v, r) => r.category?.path_label ?? r.category?.name ?? "—",
    },
    {
      title: t("colBrand"),
      key: "brand",
      width: 110,
      ellipsis: true,
      render: (_v, r) => r.brand?.name ?? "—",
    },
    {
      title: t("colBaseUom"),
      key: "base_uom",
      width: 90,
      render: (_v, r) => r.base_uom?.code ?? r.base_uom?.name ?? "—",
    },
    {
      title: t("colTrack"),
      dataIndex: "track_inventory",
      key: "track_inventory",
      width: 72,
      render: (v) => (v ? t("yes") : t("no")),
    },
    {
      title: t("colStatus"),
      dataIndex: "is_active",
      key: "is_active",
      width: 88,
      sorter: (a, b) => Number(b.is_active) - Number(a.is_active),
      render: (v) => renderActiveInactiveStatus(v, t),
    },
    {
      title: t("colActions"),
      key: "actions",
      fixed: "end",
      width: 72,
      align: "center",
      render: (_, record) => (
        <Dropdown
          trigger={["click"]}
          menu={{
            items: [
              { key: "view", label: t("actionView"), icon: <EyeOutlined />, onClick: () => onView?.(record) },
              { key: "edit", label: t("actionEdit"), icon: <EditOutlined />, onClick: () => onEdit?.(record) },
              { type: "divider" },
              {
                key: "delete",
                label: t("actionDelete"),
                icon: <DeleteOutlined />,
                danger: true,
                onClick: () => onDelete?.(record),
              },
            ],
          }}
        >
          <Button type="text" size="small" icon={<MoreOutlined />} aria-label={t("actionMenu")} />
        </Dropdown>
      ),
    },
  ];
}
