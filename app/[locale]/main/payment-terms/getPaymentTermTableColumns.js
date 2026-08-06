import { formatTenantDate } from "@/lib/tenant-format";
import { renderActiveInactiveStatus } from "@/components/tables/ActiveStatusBadge";
import { DeleteOutlined, EditOutlined, EyeOutlined, MoreOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Button, Dropdown, Typography } from "antd";

const toTime = (value) => (value ? dayjs(value).valueOf() : 0);

export function getPaymentTermStatusLabel(value, t) {
  return value ? t("statusActive") : t("statusInactive");
}

export function getPaymentTermDefaultLabel(value, t) {
  return value ? t("defaultYes") : t("defaultNo");
}

/**
 * @param {(key: string) => string} t `useTranslations("PaymentTerms")`
 * @param {{
 *   onView?: (record: unknown) => void;
 *   onEdit?: (record: unknown) => void;
 *   onDelete?: (record: unknown) => void;
 * }} [actions]
 * @returns {import("antd").TableProps["columns"]}
 */
export function getPaymentTermTableColumns(t, actions = {}) {
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
      title: t("colCode"),
      dataIndex: "code",
      key: "code",
      width: 120,
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
      title: t("colName"),
      dataIndex: "name",
      key: "name",
      width: 200,
      ellipsis: true,
    },
    {
      title: t("colDueDays"),
      dataIndex: "due_days",
      key: "due_days",
      width: 100,
      sorter: (a, b) => Number(a.due_days) - Number(b.due_days),
    },
    {
      title: t("colDescription"),
      dataIndex: "description",
      key: "description",
      width: 220,
      ellipsis: true,
      render: (value) => (typeof value === "string" && value.trim() ? value : "\u2014"),
    },
    {
      title: t("colDefault"),
      dataIndex: "is_default",
      key: "is_default",
      width: 110,
      sorter: (a, b) => Number(b.is_default) - Number(a.is_default),
      render: (value) =>
        value ? (
          <Typography.Text strong>{getPaymentTermDefaultLabel(value, t)}</Typography.Text>
        ) : (
          <Typography.Text type="secondary">{getPaymentTermDefaultLabel(value, t)}</Typography.Text>
        ),
    },
    {
      title: t("colStatus"),
      dataIndex: "is_active",
      key: "is_active",
      width: 110,
      sorter: (a, b) => Number(b.is_active) - Number(a.is_active),
      render: (value) => renderActiveInactiveStatus(value, t),
    },
    {
      title: t("colCreatedAt"),
      dataIndex: "created_at",
      key: "created_at",
      width: 168,
      sorter: (a, b) => toTime(a.created_at) - toTime(b.created_at),
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
