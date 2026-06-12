import ItemPrimaryImageCell from "@/components/items/ItemPrimaryImageCell";
import { DeleteOutlined, EditOutlined, EyeOutlined, MoreOutlined } from "@ant-design/icons";
import { Button, Dropdown, Tag, Typography } from "antd";
import { getItemTypeLabel } from "@/services/itemTypesApi";

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
    {
      title: t("colItemCode"),
      dataIndex: "item_code",
      key: "item_code",
      width: 110,
      ellipsis: true,
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
      title: t("colImage"),
      key: "primary_image",
      width: 56,
      align: "center",
      onHeaderCell: () => ({ className: "items-table-image-cell" }),
      onCell: () => ({ className: "items-table-image-cell" }),
      render: (_v, r) => <ItemPrimaryImageCell itemId={r.id} primaryImage={r.primary_image} />,
    },
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
      title: t("colColor"),
      key: "color",
      width: 56,
      align: "center",
      render: (_v, r) =>
        r.color ? (
          <span
            className="inline-block h-5 w-5 rounded border border-[var(--ant-color-border)]"
            style={{ backgroundColor: String(r.color) }}
            title={String(r.color)}
          />
        ) : (
          "—"
        ),
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
