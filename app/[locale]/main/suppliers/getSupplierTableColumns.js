import { DeleteOutlined, EditOutlined, MoreOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Button, Dropdown, Typography } from "antd";

const toTime = (value) => (value ? dayjs(value).valueOf() : 0);

export function getSupplierStatusLabel(value, t) {
  return value ? t("statusActive") : t("statusInactive");
}

const formatMoney = (value) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toFixed(4) : "0.0000";
};

/**
 * @param {(key: string) => string} t `useTranslations("Suppliers")`
 * @returns {import("antd").TableProps["columns"]}
 */
export function getSupplierTableColumns(t) {
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
      dataIndex: "supplier_code",
      key: "supplier_code",
      width: 170,
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
      width: 220,
      ellipsis: true,
    },
    {
      title: t("colGroup"),
      dataIndex: "supplier_group",
      key: "supplier_group",
      width: 180,
      ellipsis: true,
      render: (value) => value?.name || "—",
      sorter: (a, b) =>
        String(a?.supplier_group?.name ?? "").localeCompare(
          String(b?.supplier_group?.name ?? ""),
        ),
    },
    {
      title: t("colPhone"),
      dataIndex: "phone",
      key: "phone",
      width: 170,
      ellipsis: true,
      render: (value) => value || "—",
    },
    {
      title: t("colEmail"),
      dataIndex: "email",
      key: "email",
      width: 220,
      ellipsis: true,
      render: (value) => value || "—",
    },
    {
      title: t("colCreditLimit"),
      dataIndex: "credit_limit",
      key: "credit_limit",
      width: 140,
      sorter: (a, b) => Number(a.credit_limit ?? 0) - Number(b.credit_limit ?? 0),
      render: (value) => formatMoney(value),
    },
    {
      title: t("colBalance"),
      dataIndex: "balance",
      key: "balance",
      width: 140,
      sorter: (a, b) => Number(a.balance ?? 0) - Number(b.balance ?? 0),
      render: (value) => formatMoney(value),
    },
    {
      title: t("colStatus"),
      dataIndex: "is_active",
      key: "is_active",
      width: 120,
      sorter: (a, b) => Number(b.is_active) - Number(a.is_active),
      render: (value) =>
        value ? (
          <Typography.Text strong>{getSupplierStatusLabel(value, t)}</Typography.Text>
        ) : (
          <Typography.Text type="secondary">
            {getSupplierStatusLabel(value, t)}
          </Typography.Text>
        ),
    },
    {
      title: t("colCreatedAt"),
      dataIndex: "created_at",
      key: "created_at",
      width: 168,
      sorter: (a, b) => toTime(a.created_at) - toTime(b.created_at),
      render: (value) => (value ? dayjs(value).format("YYYY-MM-DD") : "—"),
    },
    {
      title: t("colUpdatedAt"),
      dataIndex: "updated_at",
      key: "updated_at",
      width: 168,
      sorter: (a, b) => toTime(a.updated_at) - toTime(b.updated_at),
      render: (value) => (value ? dayjs(value).format("YYYY-MM-DD") : "—"),
    },
    {
      title: t("colActions"),
      key: "actions",
      fixed: "end",
      width: 72,
      align: "center",
      render: () => (
        <Dropdown
          trigger={["click"]}
          menu={{
            items: [
              {
                key: "edit",
                label: t("actionEdit"),
                icon: <EditOutlined />,
                disabled: true,
              },
              { type: "divider" },
              {
                key: "delete",
                label: t("actionDelete"),
                icon: <DeleteOutlined />,
                danger: true,
                disabled: true,
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
