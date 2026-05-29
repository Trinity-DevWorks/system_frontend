import { renderActiveInactiveStatus } from "@/components/tables/ActiveStatusBadge";
import { DeleteOutlined, EditOutlined, EyeOutlined, MoreOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Button, Dropdown, Typography } from "antd";

const toTime = (value) => (value ? dayjs(value).valueOf() : 0);

export function getPaymentMethodStatusLabel(value, t) {
  return value ? t("statusActive") : t("statusInactive");
}

export function getPaymentMethodDefaultLabel(value, t) {
  return value ? t("defaultYes") : t("defaultNo");
}

export function getPaymentMethodTypeLabel(type, t) {
  const raw = String(type ?? "").trim();
  if (!raw) return "\u2014";
  const key = `type_${raw.replace(/[^a-z0-9]+/gi, "_")}`;
  const translated = t(key);
  return translated === key ? raw : translated;
}

/**
 * @param {(key: string) => string} t `useTranslations("PaymentMethods")`
 * @param {{
 *   onView?: (record: unknown) => void;
 *   onEdit?: (record: unknown) => void;
 *   onDelete?: (record: unknown) => void;
 * }} [actions]
 * @returns {import("antd").TableProps["columns"]}
 */
export function getPaymentMethodTableColumns(t, actions = {}) {
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
      width: 180,
      ellipsis: true,
    },
    {
      title: t("colType"),
      dataIndex: "type",
      key: "type",
      width: 140,
      render: (value) => getPaymentMethodTypeLabel(value, t),
    },
    {
      title: t("colCurrency"),
      dataIndex: "currency_code",
      key: "currency_code",
      width: 100,
      render: (_, record) => {
        const code = record?.currency_code;
        return typeof code === "string" && code.trim() ? (
          <Typography.Text code className="text-xs">
            {code.trim()}
          </Typography.Text>
        ) : (
          "\u2014"
        );
      },
    },
    {
      title: t("colRequiresReference"),
      dataIndex: "requires_reference",
      key: "requires_reference",
      width: 130,
      render: (v) => (v ? t("yes") : t("no")),
    },
    {
      title: t("colSupportsChange"),
      dataIndex: "supports_change",
      key: "supports_change",
      width: 130,
      render: (v) => (v ? t("yes") : t("no")),
    },
    {
      title: t("colDefault"),
      dataIndex: "is_default",
      key: "is_default",
      width: 100,
      sorter: (a, b) => Number(b.is_default) - Number(a.is_default),
      render: (value) =>
        value ? (
          <Typography.Text strong>{getPaymentMethodDefaultLabel(value, t)}</Typography.Text>
        ) : (
          <Typography.Text type="secondary">{getPaymentMethodDefaultLabel(value, t)}</Typography.Text>
        ),
    },
    {
      title: t("colStatus"),
      dataIndex: "is_active",
      key: "is_active",
      width: 100,
      sorter: (a, b) => Number(b.is_active) - Number(a.is_active),
      render: (value) => renderActiveInactiveStatus(value, t),
    },
    {
      title: t("colCreatedAt"),
      dataIndex: "created_at",
      key: "created_at",
      width: 168,
      sorter: (a, b) => toTime(a.created_at) - toTime(b.created_at),
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
          <Button type="text" size="small" icon={<MoreOutlined />} aria-label={t("actionMenu")} />
        </Dropdown>
      ),
    },
  ];
}
