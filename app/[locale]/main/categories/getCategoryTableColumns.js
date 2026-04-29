import { DeleteOutlined, EditOutlined, MoreOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Button, Dropdown, Typography } from "antd";

const toTime = (value) => (value ? dayjs(value).valueOf() : 0);

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

export function getCategoryStatusLabel(value, t) {
  return value ? t("statusActive") : t("statusInactive");
}

function getStatusBadgeClass(value) {
  return value
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300"
    : "border-red-200 bg-red-50 text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300";
}

/**
 * @param {(key: string) => string} t `useTranslations("Categories")`
 * @returns {import("antd").TableProps["columns"]}
 */
export function getCategoryTableColumns(t) {
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
      width: 160,
      sorter: (a, b) => {
        const left = normalizeText(a?.code);
        const right = normalizeText(b?.code);
        return left.localeCompare(right);
      },
      render: (value) => {
        const v = normalizeText(value);
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
      width: 220,
      ellipsis: true,
    },
    {
      title: t("colColor"),
      dataIndex: "color",
      key: "color",
      width: 220,
      render: (value) => {
        const v = normalizeText(value);
        if (!v) return "\u2014";

        return (
          <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/[0.02] px-2 py-0.5 dark:border-white/15 dark:bg-white/[0.06]">
            <span
              className="inline-block size-2.5 shrink-0 rounded-full ring-1 ring-black/15 dark:ring-white/20"
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
      title: t("colDescription"),
      dataIndex: "description",
      key: "description",
      width: 300,
      ellipsis: true,
      render: (value) => {
        const v = normalizeText(value);
        if (!v) return "\u2014";

        return (
          <Typography.Text ellipsis className="block">
            {v}
          </Typography.Text>
        );
      },
    },
    {
      title: t("colStatus"),
      dataIndex: "is_active",
      key: "is_active",
      width: 120,
      sorter: (a, b) => Number(b.is_active) - Number(a.is_active),
      render: (value) => {
        const label = getCategoryStatusLabel(value, t);

        return (
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusBadgeClass(value)}`}
          >
            {label}
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

