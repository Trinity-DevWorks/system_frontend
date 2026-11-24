import { formatTenantDate } from "@/lib/tenant-format";
import { renderActiveInactiveStatus } from "@/shared/components/tables/ActiveStatusBadge";
import { DeleteOutlined, EditOutlined, EyeOutlined, MoreOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Button, Dropdown, Tag, Typography } from "antd";

const toTime = (value) => (value ? dayjs(value).valueOf() : 0);

const normalizeText = (value) => (typeof value === "string" ? value.trim() : "");

/**
 * @param {(key: string) => string} t `useTranslations("CentralUsers")`
 * @param {{
 *   onEdit?: (record: unknown) => void;
 *   onView?: (record: unknown) => void;
 *   onDelete?: (record: unknown) => void;
 *   currentUserId?: string | number | null;
 * }} [actions]
 * @returns {import("antd").TableProps["columns"]}
 */
export function getCentralUserTableColumns(t, actions = {}) {
  const { onEdit, onView, onDelete, currentUserId = null } = actions;
  const isSelf = (record) => currentUserId != null && String(record?.id) === String(currentUserId);
  return [
    {
      title: t("colName"),
      dataIndex: "name",
      key: "name",
      width: 180,
      ellipsis: true,
      sorter: (a, b) =>
        normalizeText(a?.name).localeCompare(normalizeText(b?.name), undefined, { sensitivity: "base" }),
      render: (value, record) => (
        <span>
          {value}
          {isSelf(record) ? (
            <Tag className="ms-2" variant="filled">
              {t("youTag")}
            </Tag>
          ) : null}
        </span>
      ),
    },
    {
      title: t("colEmail"),
      dataIndex: "email",
      key: "email",
      width: 240,
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
      width: 160,
      ellipsis: true,
      render: (value, record) => {
        const name = normalizeText(value);
        if (!name) return "\u2014";
        return record?.role?.is_system ? (
          <Tag color="gold" variant="filled">
            {name}
          </Tag>
        ) : (
          name
        );
      },
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
      render: (value) => formatTenantDate(value) || "\u2014",
    },
    {
      title: t("colUpdatedAt"),
      dataIndex: "updated_at",
      key: "updated_at",
      width: 120,
      sorter: (a, b) => toTime(a.updated_at) - toTime(b.updated_at),
      render: (value) => formatTenantDate(value) || "\u2014",
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
                disabled: !onDelete || isSelf(record),
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
