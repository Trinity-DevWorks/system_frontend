import { forwardArrow } from "@/lib/direction-arrow";
import { formatTenantDate } from "@/lib/tenant-format";
import { renderActiveInactiveStatus } from "@/shared/components/tables/ActiveStatusBadge";
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { Button, Dropdown, Tag, Typography } from "antd";

const toTime = (value) => (value ? dayjs(value).valueOf() : 0);

export function getPriceListStatusLabel(value, t) {
  return value ? t("statusActive") : t("statusInactive");
}

/**
 * @param {(key: string) => string} t `useTranslations("PriceLists")`
 * @param {{
 *   onView?: (record: unknown) => void;
 *   onEdit?: (record: unknown) => void;
 *   onDelete?: (record: unknown) => void;
 * }} [actions]
 * @returns {import("antd").TableProps["columns"]}
 */
export function getPriceListTableColumns(t, actions = {}) {
  const { onView, onEdit, onDelete } = actions;
  return [
    {
      title: t("colCode"),
      dataIndex: "code",
      key: "code",
      width: 180,
      ellipsis: true,
      render: (value) => {
        const v = typeof value === "string" ? value.trim() : "";
        return v ? (
          <Typography.Text code className="text-xs">
            {v}
          </Typography.Text>
        ) : (
          "—"
        );
      },
    },
    {
      title: t("colName"),
      dataIndex: "name",
      key: "name",
      width: 260,
      ellipsis: true,
    },
    {
      title: t("colCurrency"),
      dataIndex: "currency_code",
      key: "currency_code",
      width: 100,
      render: (value) => value || "—",
    },
    {
      title: t("colValidity"),
      key: "validity",
      width: 220,
      render: (_, record) => {
        const from = record?.valid_from
          ? formatTenantDate(record.valid_from)
          : "";
        const to = record?.valid_to ? formatTenantDate(record.valid_to) : "";
        if (!from && !to) return t("validityAlways");
        return `${from || "…"} ${forwardArrow()} ${to || "…"}`;
      },
    },
    {
      title: t("colDefault"),
      dataIndex: "is_default",
      key: "is_default",
      width: 100,
      render: (value) =>
        value ? <Tag color="blue">{t("defaultTag")}</Tag> : "—",
    },
    {
      title: t("colItemsCount"),
      dataIndex: "items_count",
      key: "items_count",
      width: 100,
      align: "end",
      render: (value) => (value == null ? "—" : value),
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
      title: t("colUpdatedAt"),
      dataIndex: "updated_at",
      key: "updated_at",
      width: 168,
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
