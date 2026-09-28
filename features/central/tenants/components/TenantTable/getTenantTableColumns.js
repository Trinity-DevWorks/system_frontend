import { formatTenantDate } from "@/lib/tenant-format";
import { EditOutlined, EyeOutlined, MoreOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Button, Dropdown, Tag, Typography } from "antd";
import { isTenantSuspended } from "../../utils/tenantDrawerUtils";

const toTime = (value) => (value ? dayjs(value).valueOf() : 0);

const normalizeText = (value) => (typeof value === "string" ? value.trim() : "");

/**
 * @param {unknown} status
 * @param {(key: string) => string} t `useTranslations("CentralTenants")`
 */
export function renderTenantStatus(status, t) {
  return isTenantSuspended(status) ? (
    <Tag color="error">{t("statusSuspended")}</Tag>
  ) : (
    <Tag color="success">{t("statusActive")}</Tag>
  );
}

/**
 * @param {(key: string) => string} t `useTranslations("CentralTenants")`
 * @param {{
 *   onEdit?: (record: unknown) => void;
 *   onView?: (record: unknown) => void;
 * }} [actions]
 * @returns {import("antd").TableProps["columns"]}
 */
export function getTenantTableColumns(t, actions = {}) {
  const { onEdit, onView } = actions;
  return [
    {
      title: t("colId"),
      dataIndex: "id",
      key: "id",
      width: 140,
      ellipsis: true,
      sorter: (a, b) => normalizeText(a?.id).localeCompare(normalizeText(b?.id)),
      render: (value) => <Typography.Text code>{value}</Typography.Text>,
    },
    {
      title: t("colName"),
      dataIndex: "name",
      key: "name",
      width: 200,
      ellipsis: true,
      sorter: (a, b) =>
        normalizeText(a?.name).localeCompare(normalizeText(b?.name), undefined, { sensitivity: "base" }),
      render: (value) => normalizeText(value) || "\u2014",
    },
    {
      title: t("colDomain"),
      dataIndex: "primary_domain",
      key: "primary_domain",
      width: 220,
      ellipsis: true,
      render: (value) => normalizeText(value) || "\u2014",
    },
    {
      title: t("colStatus"),
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (value) => renderTenantStatus(value, t),
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
            ],
          }}
        >
          <Button type="text" size="small" icon={<MoreOutlined />} aria-label={t("actionMenu")} />
        </Dropdown>
      ),
    },
  ];
}
