import { DeleteOutlined, EditOutlined, MoreOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Button, Dropdown, Typography } from "antd";

const toTime = (value) => (value ? dayjs(value).valueOf() : 0);

const toPercentageNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const formatPercentage = (value) => {
  if (value === null || typeof value === "undefined") return "\u2014";
  const raw = typeof value === "number" ? value.toFixed(2) : String(value).trim();
  return raw ? `${raw}%` : "\u2014";
};

/**
 * @param {(key: string) => string} t `useTranslations("VatGroups")`
 * @returns {import("antd").TableProps["columns"]}
 */
export function getVatGroupTableColumns(t) {
  return [
    {
      title: t("colId"),
      dataIndex: "id",
      key: "id",
      width: 72,
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: t("colAbbreviation"),
      dataIndex: "abrv",
      key: "abrv",
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
      title: t("colPercentage"),
      dataIndex: "percentage",
      key: "percentage",
      width: 132,
      sorter: (a, b) => toPercentageNumber(a.percentage) - toPercentageNumber(b.percentage),
      render: (value) => (
        <Typography.Text code className="text-xs">
          {formatPercentage(value)}
        </Typography.Text>
      ),
    },
    {
      title: t("colDefault"),
      dataIndex: "is_default",
      key: "is_default",
      width: 120,
      sorter: (a, b) => Number(b.is_default) - Number(a.is_default),
      render: (value) =>
        value ? (
          <Typography.Text strong>{t("defaultYes")}</Typography.Text>
        ) : (
          <Typography.Text type="secondary">{t("defaultNo")}</Typography.Text>
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

