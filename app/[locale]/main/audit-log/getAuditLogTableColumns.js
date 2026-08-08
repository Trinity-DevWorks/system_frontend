import { formatTenantDateTime } from "@/lib/tenant-format";
import { EyeOutlined, MoreOutlined } from "@ant-design/icons";
import { Button, Dropdown, Typography } from "antd";
import dayjs from "dayjs";
import { getAuditEventLabel, getAuditableTypeLabel } from "./auditLogLabels";

const toTime = (value) => (value ? dayjs(value).valueOf() : 0);

/**
 * @param {(key: string) => string} t
 * @param {{ onView?: (record: Record<string, unknown>) => void }} [actions]
 * @returns {import("antd").TableProps["columns"]}
 */
export function getAuditLogTableColumns(t, actions = {}) {
  const { onView } = actions;

  return [
    {
      title: t("colCreatedAt"),
      dataIndex: "created_at",
      key: "created_at",
      width: 180,
      sorter: (a, b) => toTime(a.created_at) - toTime(b.created_at),
      defaultSortOrder: "descend",
      render: (value) => {
        const label = formatTenantDateTime(value);
        return label || <Typography.Text type="secondary">{"\u2014"}</Typography.Text>;
      },
    },
    {
      title: t("colEvent"),
      dataIndex: "event",
      key: "event",
      width: 140,
      render: (value) => getAuditEventLabel(t, value),
    },
    {
      title: t("colUser"),
      key: "user",
      width: 180,
      ellipsis: true,
      render: (_v, record) => {
        const name = record?.user?.name;
        const email = record?.user?.email;
        if (typeof name === "string" && name.trim()) return name;
        if (typeof email === "string" && email.trim()) return email;
        return <Typography.Text type="secondary">{"\u2014"}</Typography.Text>;
      },
    },
    {
      title: t("colAuditableType"),
      key: "auditable_type",
      width: 160,
      ellipsis: true,
      render: (_v, record) => getAuditableTypeLabel(t, record?.auditable?.type),
    },
    {
      title: t("colAuditableId"),
      key: "auditable_id",
      width: 120,
      ellipsis: true,
      render: (_v, record) => {
        const id = record?.auditable?.id;
        return id != null && String(id).trim() ? (
          <Typography.Text code className="text-xs">
            {String(id)}
          </Typography.Text>
        ) : (
          <Typography.Text type="secondary">{"\u2014"}</Typography.Text>
        );
      },
    },
    {
      title: t("colIp"),
      dataIndex: "ip_address",
      key: "ip_address",
      width: 130,
      ellipsis: true,
      render: (value) =>
        typeof value === "string" && value.trim() ? (
          value
        ) : (
          <Typography.Text type="secondary">{"\u2014"}</Typography.Text>
        ),
    },
    {
      title: t("colTags"),
      dataIndex: "tags",
      key: "tags",
      width: 160,
      ellipsis: true,
      render: (value) =>
        typeof value === "string" && value.trim() ? (
          value
        ) : (
          <Typography.Text type="secondary">{"\u2014"}</Typography.Text>
        ),
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
            ],
          }}
        >
          <Button type="text" size="small" icon={<MoreOutlined />} aria-label={t("actionMenu")} />
        </Dropdown>
      ),
    },
  ];
}
