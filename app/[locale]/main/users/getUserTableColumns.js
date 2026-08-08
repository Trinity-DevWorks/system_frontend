import { formatTenantDate } from "@/lib/tenant-format";
import { renderActiveInactiveStatus } from "@/components/tables/ActiveStatusBadge";
import { DeleteOutlined, EditOutlined, EyeOutlined, MoreOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Button, Dropdown, Typography } from "antd";

const toTime = (value) => (value ? dayjs(value).valueOf() : 0);

const normalizeText = (value) => (typeof value === "string" ? value.trim() : "");

export function getUserStatusLabel(value, t) {
  return value ? t("statusActive") : t("statusInactive");
}

/**
 * @param {(key: string) => string} t `useTranslations("Users")`
 * @param {{
 *   onEdit?: (record: unknown) => void;
 *   onView?: (record: unknown) => void;
 *   onDelete?: (record: unknown) => void;
 * }} [actions]
 * @returns {import("antd").TableProps["columns"]}
 */
export function getUserTableColumns(t, actions = {}) {
  const { onEdit, onView, onDelete } = actions;
  return [
    {
      title: t("colName"),
      dataIndex: "name",
      key: "name",
      width: 160,
      ellipsis: true,
      sorter: (a, b) =>
        normalizeText(a?.name).localeCompare(normalizeText(b?.name), undefined, { sensitivity: "base" }),
    },
    {
      title: t("colEmail"),
      dataIndex: "email",
      key: "email",
      width: 220,
      ellipsis: true,
      render: (value) => {
        const v = normalizeText(value);
        return v ? (
          <Typography.Text copyable className="text-sm">
            {v}
          </Typography.Text>
        ) : (
          "\u2014"
        );
      },
    },
    {
      title: t("colRole"),
      dataIndex: "role_name",
      key: "role_name",
      width: 140,
      ellipsis: true,
      render: (value) => normalizeText(value) || "\u2014",
    },
    {
      title: t("colStatus"),
      dataIndex: "is_active",
      key: "is_active",
      width: 96,
      sorter: (a, b) => Number(b.is_active) - Number(a.is_active),
      render: (value) => renderActiveInactiveStatus(value, t),
    },
    {
      title: t("colCreatedAt"),
      dataIndex: "created_at",
      key: "created_at",
      width: 120,
      sorter: (a, b) => toTime(a.created_at) - toTime(b.created_at),
      render: (value) => (formatTenantDate(value) || "\u2014"),
    },
    {
      title: t("colUpdatedAt"),
      dataIndex: "updated_at",
      key: "updated_at",
      width: 120,
      sorter: (a, b) => toTime(a.updated_at) - toTime(b.updated_at),
      render: (value) => (formatTenantDate(value) || "\u2014"),
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
          <Button type="text" size="small" icon={<MoreOutlined />} aria-label={t("actionMenu")} />
        </Dropdown>
      ),
    },
  ];
}
