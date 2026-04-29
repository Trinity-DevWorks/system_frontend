import { DeleteOutlined, EditOutlined, MoreOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Button, Dropdown, Typography } from "antd";

const toTime = (value) => (value ? dayjs(value).valueOf() : 0);

export function getUnitGroupDimensionTypeLabel(value, t) {
  const normalized =
    typeof value === "string" ? value.trim().toLocaleLowerCase() : "";

  switch (normalized) {
    case "count":
      return t("dimensionCount");
    case "weight":
      return t("dimensionWeight");
    case "length":
      return t("dimensionLength");
    case "volume":
      return t("dimensionVolume");
    case "other":
      return t("dimensionOther");
    default:
      return normalized ? value.trim() : "\u2014";
  }
}

export function getUnitGroupStatusLabel(value, t) {
  return value ? t("statusActive") : t("statusInactive");
}

/**
 * @param {(key: string) => string} t `useTranslations("UnitGroups")`
 * @returns {import("antd").TableProps["columns"]}
 */
export function getUnitGroupTableColumns(t) {
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
      width: 140,
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
      width: 240,
      ellipsis: true,
    },
    {
      title: t("colDimensionType"),
      dataIndex: "dimension_type",
      key: "dimension_type",
      width: 160,
      ellipsis: true,
      render: (value) => (
        <Typography.Text ellipsis>
          {getUnitGroupDimensionTypeLabel(value, t)}
        </Typography.Text>
      ),
    },
    {
      title: t("colStatus"),
      dataIndex: "is_active",
      key: "is_active",
      width: 120,
      sorter: (a, b) => Number(b.is_active) - Number(a.is_active),
      render: (value) =>
        value ? (
          <Typography.Text strong>{getUnitGroupStatusLabel(value, t)}</Typography.Text>
        ) : (
          <Typography.Text type="secondary">
            {getUnitGroupStatusLabel(value, t)}
          </Typography.Text>
        ),
    },
    {
      title: t("colCreatedAt"),
      dataIndex: "created_at",
      key: "created_at",
      width: 180,
      sorter: (a, b) => toTime(a.created_at) - toTime(b.created_at),
      render: (value) => (value ? dayjs(value).format("MMMM D, YYYY") : "\u2014"),
    },
    {
      title: t("colUpdatedAt"),
      dataIndex: "updated_at",
      key: "updated_at",
      width: 168,
      sorter: (a, b) => toTime(a.updated_at) - toTime(b.updated_at),
      render: (value) => (value ? dayjs(value).format("MMMM D, YYYY") : "\u2014"),
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

