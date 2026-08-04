import { formatTenantDate } from "@/lib/tenant-format";
import { renderActiveInactiveStatus } from "@/components/tables/ActiveStatusBadge";
import { DeleteOutlined, EditOutlined, EyeOutlined, MoreOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Button, Dropdown, Typography } from "antd";
import { isSystemRoleName } from "./drawer/roleDrawerUtils";

const toTime = (value) => (value ? dayjs(value).valueOf() : 0);

const normalizeText = (value) => (typeof value === "string" ? value.trim() : "");

export function getRoleStatusLabel(value, t) {
  return value ? t("statusActive") : t("statusInactive");
}

/**
 * @param {(key: string) => string} t `useTranslations("Roles")`
 * @param {{
 *   onEdit?: (record: unknown) => void;
 *   onView?: (record: unknown) => void;
 *   onDelete?: (record: unknown) => void;
 * }} [actions]
 * @returns {import("antd").TableProps["columns"]}
 */
export function getRoleTableColumns(t, actions = {}) {
  const { onEdit, onView, onDelete } = actions;
  return [
    {
      title: t("colId"),
      dataIndex: "id",
      key: "id",
      width: 56,
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: t("colName"),
      dataIndex: "name",
      key: "name",
      width: 140,
      ellipsis: true,
      sorter: (a, b) =>
        normalizeText(a?.name).localeCompare(normalizeText(b?.name), undefined, { sensitivity: "base" }),
    },
    {
      title: t("colDescription"),
      dataIndex: "description",
      key: "description",
      width: 240,
      ellipsis: true,
      render: (value) => {
        const v = normalizeText(value);
        return v ? (
          <Typography.Text ellipsis className="block">
            {v}
          </Typography.Text>
        ) : (
          "\u2014"
        );
      },
    },
    {
      title: t("colStatus"),
      dataIndex: "active",
      key: "active",
      width: 96,
      sorter: (a, b) => Number(b.active) - Number(a.active),
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
      render: (_, record) => {
        const systemRole = isSystemRoleName(record?.name);
        return (
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
                  disabled: !onDelete || systemRole,
                  onClick: () => onDelete?.(record),
                },
              ],
            }}
          >
            <Button type="text" size="small" icon={<MoreOutlined />} aria-label={t("actionMenu")} />
          </Dropdown>
        );
      },
    },
  ];
}
