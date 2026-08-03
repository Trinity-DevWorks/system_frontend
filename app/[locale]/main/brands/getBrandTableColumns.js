import { formatTenantDate } from "@/lib/tenant-format";
import { renderActiveInactiveStatus } from "@/components/tables/ActiveStatusBadge";
import { DeleteOutlined, EditOutlined, EyeOutlined, MoreOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Button, Dropdown, Typography } from "antd";

const toTime = (value) => (value ? dayjs(value).valueOf() : 0);

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

export function getBrandStatusLabel(value, t) {
  return value ? t("statusActive") : t("statusInactive");
}

/**
 * @param {(key: string) => string} t `useTranslations("Brands")`
 * @param {{
 *   onEdit?: (record: unknown) => void;
 *   onView?: (record: unknown) => void;
 *   onDelete?: (record: unknown) => void;
 * }} [actions]
 * @returns {import("antd").TableProps["columns"]}
 */
export function getBrandTableColumns(t, actions = {}) {
  const { onEdit, onView, onDelete } = actions;
  return [
    {
      title: t("colId"),
      dataIndex: "id",
      key: "id",
      width: 50,
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: t("colCode"),
      dataIndex: "code",
      key: "code",
      width: 110,
      sorter: (a, b) => {
        const left = normalizeText(a?.code);
        const right = normalizeText(b?.code);
        return left.localeCompare(right);
      },
      render: (value) => {
        const v = normalizeText(value);
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
      title: t("colName"),
      dataIndex: "name",
      key: "name",
      width: 160,
      ellipsis: true,
    },
    {
      title: t("colSubBrandOf"),
      dataIndex: "parent_brand",
      key: "parent_brand",
      width: 180,
      ellipsis: true,
      render: (_value, record) => {
        const parent = record?.parent_brand;
        if (!parent || typeof parent !== "object") return "\u2014";
        const name = normalizeText(parent.name);
        const code = normalizeText(parent.code);
        if (!name && !code) return "\u2014";
        return (
          <span className="inline-flex flex-col gap-0.5">
            {name ? <span>{name}</span> : null}
            {code ? (
              <Typography.Text type="secondary" code className="text-xs">
                {code}
              </Typography.Text>
            ) : null}
          </span>
        );
      },
    },
    {
      title: t("colStatus"),
      dataIndex: "is_active",
      key: "is_active",
      width: 80,
      sorter: (a, b) => Number(b.is_active) - Number(a.is_active),
      render: (value) => renderActiveInactiveStatus(value, t),
    },
    {
      title: t("colCreatedAt"),
      dataIndex: "created_at",
      key: "created_at",
      width: 100,
      sorter: (a, b) => toTime(a.created_at) - toTime(b.created_at),
      render: (value) => (formatTenantDate(value) || "\u2014"),
    },
    {
      title: t("colUpdatedAt"),
      dataIndex: "updated_at",
      key: "updated_at",
      width: 100,
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
