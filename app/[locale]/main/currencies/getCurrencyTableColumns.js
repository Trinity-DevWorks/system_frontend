import { formatTenantDate } from "@/lib/tenant-format";
import { DeleteOutlined, EditOutlined, EyeOutlined, HistoryOutlined, MoreOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Button, Dropdown, Tag, Typography } from "antd";

const toTime = (value) => (value ? dayjs(value).valueOf() : 0);

/**
 * @param {(key: string) => string} t `useTranslations("Currencies")`
 * @param {{
 *   onView?: (record: unknown) => void;
 *   onEdit?: (record: unknown) => void;
 *   onDelete?: (record: unknown) => void;
 *   onRateHistory?: (record: unknown) => void;
 * }} [actions]
 * @returns {import("antd").TableProps["columns"]}
 */
export function getCurrencyTableColumns(t, actions = {}) {
  const { onView, onEdit, onDelete, onRateHistory } = actions;
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
      width: 100,
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
      title: t("colIso"),
      dataIndex: "iso_code",
      key: "iso_code",
      width: 100,
      ellipsis: true,
    },
    {
      title: t("colName"),
      dataIndex: "name",
      key: "name",
      width: 220,
      ellipsis: true,
    },
    {
      title: t("colSymbol"),
      dataIndex: "symbol",
      key: "symbol",
      width: 88,
      ellipsis: true,
      render: (value) => (typeof value === "string" && value.trim() ? value : "\u2014"),
    },
    {
      title: t("colPrimary"),
      dataIndex: "is_primary",
      key: "is_primary",
      width: 110,
      sorter: (a, b) => Number(b.is_primary) - Number(a.is_primary),
      render: (value) =>
        value ? <Tag color="blue">{t("primaryYes")}</Tag> : <span className="text-slate-400">{t("primaryNo")}</span>,
    },
    {
      title: t("colActive"),
      dataIndex: "active",
      key: "active",
      width: 100,
      sorter: (a, b) => Number(b.active) - Number(a.active),
      render: (value) =>
        value !== false ? <Tag color="success">{t("activeYes")}</Tag> : <Tag>{t("activeNo")}</Tag>,
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
              {
                key: "history",
                label: t("actionRateHistory"),
                icon: <HistoryOutlined />,
                disabled: !onRateHistory,
                onClick: () => onRateHistory?.(record),
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
