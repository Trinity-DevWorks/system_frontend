import { renderActiveInactiveStatus } from "@/components/tables/ActiveStatusBadge";
import { DeleteOutlined, EditOutlined, EyeOutlined, MoreOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Button, Dropdown, Typography } from "antd";

const toTime = (value) => (value ? dayjs(value).valueOf() : 0);

export function getWarehouseStatusLabel(value, t) {
  return value ? t("statusActive") : t("statusInactive");
}

export function getWarehouseDefaultLabel(value, t) {
  return value ? t("defaultYes") : t("defaultNo");
}

/**
 * @param {(key: string) => string} t `useTranslations("Warehouses")`
 * @param {{
 *   onView?: (record: unknown) => void;
 *   onEdit?: (record: unknown) => void;
 *   onDelete?: (record: unknown) => void;
 * }} [actions]
 * @returns {import("antd").TableProps["columns"]}
 */
export function getWarehouseTableColumns(t, actions = {}) {
  const { onView, onEdit, onDelete } = actions;
  return [
    {
      title: t("colId"),
      dataIndex: "id",
      key: "id",
      width: 72,
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: t("colName"),
      dataIndex: "name",
      key: "name",
      width: 240,
      ellipsis: true,
    },
    {
      title: t("colShortcutName"),
      dataIndex: "shortcut_name",
      key: "shortcut_name",
      width: 150,
      ellipsis: true,
      render: (value) => {
        const v = typeof value === "string" ? value.trim() : "";
        return v ? (
          <Typography.Text code className="text-xs">
            {v}
          </Typography.Text>
        ) : (
          "\u2014"
        );
      },
    },
    {
      title: t("colStatus"),
      dataIndex: "is_active",
      key: "is_active",
      width: 120,
      sorter: (a, b) => Number(b.is_active) - Number(a.is_active),
      render: (value) => renderActiveInactiveStatus(value, t),
    },
    {
      title: t("colDefault"),
      dataIndex: "is_default",
      key: "is_default",
      width: 120,
      sorter: (a, b) => Number(b.is_default) - Number(a.is_default),
      render: (value) =>
        value ? (
          <Typography.Text strong>{getWarehouseDefaultLabel(value, t)}</Typography.Text>
        ) : (
          <Typography.Text type="secondary">
            {getWarehouseDefaultLabel(value, t)}
          </Typography.Text>
        ),
    },
    {
      title: t("colDefaultSales"),
      dataIndex: "is_default_sales",
      key: "is_default_sales",
      width: 100,
      sorter: (a, b) => Number(b.is_default_sales) - Number(a.is_default_sales),
      render: (value) => getWarehouseDefaultLabel(value, t),
    },
    {
      title: t("colDefaultProduction"),
      dataIndex: "is_default_production",
      key: "is_default_production",
      width: 110,
      sorter: (a, b) => Number(b.is_default_production) - Number(a.is_default_production),
      render: (value) => getWarehouseDefaultLabel(value, t),
    },
    {
      title: t("colDefaultPurchase"),
      dataIndex: "is_default_purchase",
      key: "is_default_purchase",
      width: 100,
      sorter: (a, b) => Number(b.is_default_purchase) - Number(a.is_default_purchase),
      render: (value) => getWarehouseDefaultLabel(value, t),
    },
    {
      title: t("colDefaultStorage"),
      dataIndex: "is_default_storage",
      key: "is_default_storage",
      width: 100,
      sorter: (a, b) => Number(b.is_default_storage) - Number(a.is_default_storage),
      render: (value) => getWarehouseDefaultLabel(value, t),
    },
    {
      title: t("colCreatedAt"),
      dataIndex: "created_at",
      key: "created_at",
      width: 180,
      sorter: (a, b) => toTime(a.created_at) - toTime(b.created_at),
      render: (value) => (value ? dayjs(value).format("MMMM D, YYYY") : "\u2014"),
    },
    {
      title: t("colUpdatedAt"),
      dataIndex: "updated_at",
      key: "updated_at",
      width: 168,
      sorter: (a, b) => toTime(a.updated_at) - toTime(b.updated_at),
      render: (value) => (value ? dayjs(value).format("MMMM D, YYYY") : "\u2014"),
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
              {
                key: "view",
                label: t("actionView"),
                icon: <EyeOutlined />,
                disabled: !onView,
                onClick: () => onView?.(record),
              },
              {
                key: "edit",
                label: t("actionEdit"),
                icon: <EditOutlined />,
                disabled: !onEdit,
                onClick: () => onEdit?.(record),
              },
              { type: "divider" },
              {
                key: "delete",
                label: t("actionDelete"),
                icon: <DeleteOutlined />,
                danger: true,
                disabled: !onDelete,
                onClick: () => onDelete?.(record),
              },
            ],
          }}
        >
          <Button
            type="text"
            size="small"
            icon={<MoreOutlined />}
            aria-label={t("actionMenu")}
          />
        </Dropdown>
      ),
    },
  ];
}

