import { formatTenantMoney } from "@/lib/tenant-format";
import { renderActiveInactiveStatus } from "@/shared/components/tables/ActiveStatusBadge";
import { DeleteOutlined, EditOutlined, EyeOutlined, MoreOutlined } from "@ant-design/icons";
import { Button, Dropdown, Space, Tag, Tooltip, Typography } from "antd";

const normalizeText = (value) => (typeof value === "string" ? value.trim() : "");

/**
 * "5" or "∞" for an unlimited (null) limit.
 * @param {unknown} value
 */
function limitText(value) {
  return value === null || value === undefined ? "∞" : String(value);
}

/**
 * @param {(key: string, values?: Record<string, unknown>) => string} t `useTranslations("CentralPlans")`
 * @param {{
 *   onEdit?: (record: unknown) => void;
 *   onView?: (record: unknown) => void;
 *   onDelete?: (record: unknown) => void;
 * }} [actions]
 * @returns {import("antd").TableProps["columns"]}
 */
export function getPlanTableColumns(t, actions = {}) {
  const { onEdit, onView, onDelete } = actions;
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
        <div className="min-w-0">
          <div className="truncate font-medium">{value}</div>
          {normalizeText(record?.description) ? (
            <Typography.Text type="secondary" ellipsis className="block text-xs">
              {record.description}
            </Typography.Text>
          ) : null}
        </div>
      ),
    },
    {
      title: t("colPrice"),
      key: "price",
      width: 150,
      sorter: (a, b) => Number(a.price ?? 0) - Number(b.price ?? 0),
      render: (_v, record) => (
        <span className="whitespace-nowrap">
          {formatTenantMoney(record.price)} {record.currency}
          <Typography.Text type="secondary"> / {t(`cycleShort_${record.billing_cycle}`)}</Typography.Text>
        </span>
      ),
    },
    {
      title: t("colLimits"),
      key: "limits",
      width: 260,
      render: (_v, record) => (
        <Space size={4} wrap>
          <Tooltip title={t("fieldMaxUsers")}>
            <Tag className="!m-0">{t("limitUsersShort", { value: limitText(record.max_users) })}</Tag>
          </Tooltip>
          <Tooltip title={t("fieldMaxBranches")}>
            <Tag className="!m-0">{t("limitBranchesShort", { value: limitText(record.max_branches) })}</Tag>
          </Tooltip>
          <Tooltip title={t("fieldMaxWarehouses")}>
            <Tag className="!m-0">{t("limitWarehousesShort", { value: limitText(record.max_warehouses) })}</Tag>
          </Tooltip>
          <Tooltip title={t("fieldMaxStorage")}>
            <Tag className="!m-0">{t("limitStorageShort", { value: limitText(record.max_storage_mb) })}</Tag>
          </Tooltip>
        </Space>
      ),
    },
    {
      title: t("colModules"),
      dataIndex: "modules",
      key: "modules",
      width: 100,
      align: "center",
      render: (value) => (Array.isArray(value) ? value.length : "—"),
    },
    {
      title: t("colTenants"),
      dataIndex: "tenants_count",
      key: "tenants_count",
      width: 90,
      align: "center",
      sorter: (a, b) => Number(a.tenants_count ?? 0) - Number(b.tenants_count ?? 0),
      render: (value) => (value == null ? "—" : value),
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
      title: t("colActions"),
      key: "actions",
      fixed: "end",
      width: 72,
      align: "center",
      render: (_, record) => {
        const inUse = Number(record?.tenants_count ?? 0) > 0;
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
                  label: inUse ? t("actionDeleteInUse") : t("actionDelete"),
                  icon: <DeleteOutlined />,
                  danger: true,
                  disabled: !onDelete || inUse,
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
