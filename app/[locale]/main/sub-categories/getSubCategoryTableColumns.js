import { DeleteOutlined, EditOutlined, MoreOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Button, Dropdown, Typography } from "antd";

const toTime = (value) => (value ? dayjs(value).valueOf() : 0);

const getCategoryName = (row) => {
  const name = row?.category?.name;
  return typeof name === "string" ? name.trim() : "";
};

const hasValue = (value) => value !== null && typeof value !== "undefined";

/**
 * @param {(key: string) => string} t `useTranslations("SubCategories")`
 * @returns {import("antd").TableProps["columns"]}
 */
export function getSubCategoryTableColumns(t) {
  return [
    {
      title: t("colId"),
      dataIndex: "id",
      key: "id",
      width: 72,
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: t("colName"),
      dataIndex: "name",
      key: "name",
      width: 220,
      ellipsis: true,
    },
    {
      title: t("colCategory"),
      dataIndex: "category_id",
      key: "category",
      width: 240,
      ellipsis: true,
      render: (value, record) => {
        const categoryName = getCategoryName(record);
        if (!categoryName && !hasValue(value)) return "\u2014";

        return (
          <span className="inline-flex min-w-0 items-center gap-2">
            {categoryName ? (
              <Typography.Text ellipsis className="min-w-0">
                {categoryName}
              </Typography.Text>
            ) : null}
            {hasValue(value) ? (
              <Typography.Text code className="shrink-0 text-xs">
                #{value}
              </Typography.Text>
            ) : null}
          </span>
        );
      },
    },
    {
      title: t("colColor"),
      dataIndex: "color",
      key: "color",
      width: 200,
      render: (value) => {
        if (!value || typeof value !== "string") return "\u2014";
        const v = value.trim();
        return (
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block size-4 shrink-0 rounded border border-black/10 dark:border-white/20"
              style={{ backgroundColor: v }}
              aria-hidden
            />
            <Typography.Text code copyable className="text-xs">
              {v}
            </Typography.Text>
          </span>
        );
      },
    },
    {
      title: t("colCreatedAt"),
      dataIndex: "created_at",
      key: "created_at",
      width: 180,
      sorter: (a, b) => toTime(a.created_at) - toTime(b.created_at),
      render: (value) => (value ? dayjs(value).format("YYYY-MM-DD") : "\u2014"),
    },
    {
      title: t("colUpdatedAt"),
      dataIndex: "updated_at",
      key: "updated_at",
      width: 168,
      sorter: (a, b) => toTime(a.updated_at) - toTime(b.updated_at),
      render: (value) => (value ? dayjs(value).format("YYYY-MM-DD") : "\u2014"),
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
