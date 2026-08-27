import { formatTenantDateTime } from "@/lib/tenant-format";
import { renderActiveInactiveStatus } from "@/shared/components/tables/ActiveStatusBadge";
import { getAdjustmentReasonDirectionLabel } from "../../utils/stockAdjustmentStatuses";
import { DeleteOutlined, EditOutlined, EyeOutlined, MoreOutlined } from "@ant-design/icons";
import { Button, Dropdown, Tag, Typography } from "antd";

/**
 * @param {(key: string) => string} t
 * @param {{
 *   onView?: (record: unknown) => void;
 *   onEdit?: (record: unknown) => void;
 *   onDelete?: (record: unknown) => void;
 * }} [actions]
 */
export function getAdjustmentReasonTableColumns(t, actions = {}) {
  const { onView, onEdit, onDelete } = actions;

  return [
    {
      title: t("colAdjReasonCode"),
      dataIndex: "code",
      key: "code",
      width: 140,
      render: (value) =>
        typeof value === "string" && value.trim() ? (
          <Typography.Text code className="text-xs">
            {value}
          </Typography.Text>
        ) : (
          "—"
        ),
    },
    {
      title: t("colAdjReasonName"),
      dataIndex: "name",
      key: "name",
      width: 220,
      ellipsis: true,
    },
    {
      title: t("colAdjReasonDirection"),
      dataIndex: "direction",
      key: "direction",
      width: 140,
      render: (value) => getAdjustmentReasonDirectionLabel(t, value),
    },
    {
      title: t("colStatus"),
      dataIndex: "is_active",
      key: "is_active",
      width: 110,
      render: (value) => renderActiveInactiveStatus(value, t),
    },
    {
      title: t("colAdjReasonSystem"),
      dataIndex: "is_system",
      key: "is_system",
      width: 110,
      render: (value) => (value ? <Tag>{t("adjReasonSystemYes")}</Tag> : "—"),
    },
    {
      title: t("colCreatedAt"),
      dataIndex: "created_at",
      key: "created_at",
      width: 180,
      render: (value) => formatTenantDateTime(value) || "—",
    },
    {
      title: t("colActions"),
      key: "actions",
      width: 72,
      fixed: "right",
      render: (_v, record) => {
        const items = [];
        if (onView) {
          items.push({ key: "view", icon: <EyeOutlined />, label: t("actionView"), onClick: () => onView(record) });
        }
        if (onEdit) {
          items.push({ key: "edit", icon: <EditOutlined />, label: t("actionEdit"), onClick: () => onEdit(record) });
        }
        if (onDelete && !record?.is_system) {
          items.push({
            key: "delete",
            icon: <DeleteOutlined />,
            danger: true,
            label: t("actionDelete"),
            onClick: () => onDelete(record),
          });
        }
        if (items.length === 0) return null;
        return (
          <Dropdown menu={{ items }} trigger={["click"]}>
            <Button type="text" icon={<MoreOutlined />} aria-label={t("actionMenu")} />
          </Dropdown>
        );
      },
    },
  ];
}
