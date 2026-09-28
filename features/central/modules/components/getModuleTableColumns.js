import { Tag, Typography } from "antd";

const normalizeText = (value) => (typeof value === "string" ? value.trim() : "");

/**
 * @param {(key: string) => string} t `useTranslations("CentralModules")`
 * @returns {import("antd").TableProps["columns"]}
 */
export function getModuleTableColumns(t) {
  return [
    {
      title: t("colCode"),
      dataIndex: "code",
      key: "code",
      width: 150,
      sorter: (a, b) => normalizeText(a?.code).localeCompare(normalizeText(b?.code)),
      render: (value) => (
        <Typography.Text code className="text-xs">
          {value}
        </Typography.Text>
      ),
    },
    {
      title: t("colName"),
      dataIndex: "name",
      key: "name",
      width: 200,
      ellipsis: true,
      sorter: (a, b) =>
        normalizeText(a?.name).localeCompare(normalizeText(b?.name), undefined, { sensitivity: "base" }),
    },
    {
      title: t("colDescription"),
      dataIndex: "description",
      key: "description",
      width: 320,
      ellipsis: true,
      render: (value) => normalizeText(value) || "\u2014",
    },
    {
      title: t("colType"),
      dataIndex: "is_core",
      key: "is_core",
      width: 110,
      render: (value) =>
        value ? (
          <Tag color="blue" variant="filled">
            {t("typeCore")}
          </Tag>
        ) : (
          <Tag variant="filled">{t("typeOptional")}</Tag>
        ),
    },
    {
      title: t("colTenants"),
      dataIndex: "tenants_count",
      key: "tenants_count",
      width: 110,
      align: "center",
      sorter: (a, b) => Number(a.tenants_count ?? 0) - Number(b.tenants_count ?? 0),
      render: (value) => (value == null ? "\u2014" : value),
    },
    {
      title: t("colSortOrder"),
      dataIndex: "sort_order",
      key: "sort_order",
      width: 100,
      align: "center",
      defaultSortOrder: "ascend",
      sorter: (a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0),
    },
  ];
}
