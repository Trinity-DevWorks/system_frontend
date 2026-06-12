import { renderActiveInactiveStatus } from "@/components/tables/ActiveStatusBadge";
import { DeleteOutlined, EditOutlined, EyeOutlined, MoreOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Button, Dropdown, Typography } from "antd";

const toTime = (value) => (value ? dayjs(value).valueOf() : 0);

export function getSalesmanStatusLabel(value, t) {
  return value ? t("statusActive") : t("statusInactive");
}

export function getSalesmanCommissionTypeLabel(type, t) {
  const v = String(type ?? "");
  const key = `commission_${v}`;
  const translated = t(key);
  return translated === key ? v : translated;
}

/**
 * @param {(key: string) => string} t `useTranslations("Salesmen")`
 * @param {{
 *   onView?: (record: unknown) => void;
 *   onEdit?: (record: unknown) => void;
 *   onDelete?: (record: unknown) => void;
 * }} [actions]
 * @returns {import("antd").TableProps["columns"]}
 */
export function getSalesmanTableColumns(t, actions = {}) {
  const { onView, onEdit, onDelete } = actions;
  return [
    {
      title: t("colCode"),
      dataIndex: "salesman_code",
      key: "salesman_code",
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
      title: t("colFullName"),
      dataIndex: "full_name",
      key: "full_name",
      width: 200,
      ellipsis: true,
    },
    {
      title: t("colPhone"),
      dataIndex: "phone",
      key: "phone",
      width: 130,
      ellipsis: true,
      render: (v) => (typeof v === "string" && v.trim() ? v : "\u2014"),
    },
    {
      title: t("colEmail"),
      dataIndex: "email",
      key: "email",
      width: 200,
      ellipsis: true,
      render: (v) => (typeof v === "string" && v.trim() ? v : "\u2014"),
    },
    {
      title: t("colWarehouse"),
      dataIndex: "warehouse_name",
      key: "warehouse_name",
      width: 160,
      ellipsis: true,
      render: (v) => (typeof v === "string" && v.trim() ? v : "\u2014"),
    },
    {
      title: t("colCommission"),
      dataIndex: "commission_type",
      key: "commission_type",
      width: 120,
      render: (value, record) => {
        const cv = record?.commission_value;
        if (value === "none" || value == null) {
          return getSalesmanCommissionTypeLabel(value, t);
        }
        if (value === "percent" && cv != null && cv !== "") {
          return <span>{String(cv)}%</span>;
        }
        if (value === "fixed" && cv != null && cv !== "") {
          return <span>{String(cv)}</span>;
        }
        if (cv != null && cv !== "") {
          const label = getSalesmanCommissionTypeLabel(value, t);
          return (
            <span>
              {label}
              <Typography.Text type="secondary" className="ml-1 text-xs">
                ({String(cv)})
              </Typography.Text>
            </span>
          );
        }
        return getSalesmanCommissionTypeLabel(value, t);
      },
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
