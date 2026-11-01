import { formatTenantDate } from "@/lib/tenant-format";
import { DeleteOutlined, EditOutlined, EyeOutlined, MoreOutlined } from "@ant-design/icons";
import { Button, Dropdown, Tag, Typography } from "antd";
import dayjs from "dayjs";

const toTime = (value) => (value ? dayjs(value).valueOf() : 0);

/**
 * @param {(key: string) => string} t `useTranslations("ItemAttributes")`
 * @param {{ onEdit?: (record: unknown) => void; onView?: (record: unknown) => void; onDelete?: (record: unknown) => void }} [actions]
 * @returns {import("antd").TableProps["columns"]}
 */
export function getItemAttributeTableColumns(t, actions = {}) {
  const { onEdit, onView, onDelete } = actions;
  return [
    { title: t("colId"), dataIndex: "id", key: "id", width: 50, sorter: (a, b) => a.id - b.id },
    {
      title: t("colCode"),
      dataIndex: "code",
      key: "code",
      width: 110,
      sorter: (a, b) => String(a.code ?? "").localeCompare(String(b.code ?? "")),
      render: (value) =>
        value ? (
          <Typography.Text code className="text-xs">
            {value}
          </Typography.Text>
        ) : (
          "—"
        ),
    },
    { title: t("colName"), dataIndex: "name", key: "name", width: 160, ellipsis: true },
    {
      title: t("colValues"),
      dataIndex: "values",
      key: "values",
      width: 320,
      render: (values) =>
        Array.isArray(values) && values.length ? (
          <span className="flex flex-wrap gap-1">
            {values.map((v) => (
              <Tag key={v.id} className="!me-0">
                {v.name}
              </Tag>
            ))}
          </span>
        ) : (
          "—"
        ),
    },
    { title: t("colSort"), dataIndex: "sort_order", key: "sort_order", width: 90, align: "right", sorter: (a, b) => a.sort_order - b.sort_order },
    {
      title: t("colCreatedAt"),
      dataIndex: "created_at",
      key: "created_at",
      width: 100,
      sorter: (a, b) => toTime(a.created_at) - toTime(b.created_at),
      render: (value) => formatTenantDate(value) || "—",
    },
    {
      title: t("colUpdatedAt"),
      dataIndex: "updated_at",
      key: "updated_at",
      width: 100,
      sorter: (a, b) => toTime(a.updated_at) - toTime(b.updated_at),
      render: (value) => formatTenantDate(value) || "—",
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
              { key: "view", label: t("actionView"), icon: <EyeOutlined />, disabled: !onView, onClick: () => onView?.(record) },
              { key: "edit", label: t("actionEdit"), icon: <EditOutlined />, disabled: !onEdit, onClick: () => onEdit?.(record) },
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
          <Button type="text" size="small" icon={<MoreOutlined />} aria-label={t("actionMenu")} />
        </Dropdown>
      ),
    },
  ];
}
