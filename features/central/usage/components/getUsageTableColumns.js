import { formatTenantDateTime } from "@/lib/tenant-format";
import { ReloadOutlined } from "@ant-design/icons";
import { Button, Progress, Tag, Tooltip, Typography } from "antd";
import { renderTenantStatus } from "../../tenants/components/TenantTable/getTenantTableColumns";

/** Sort helper: rows without usage go last. */
const usageNum = (row, key) => Number(row?.usage?.[key] ?? -1);

/**
 * "3 / 5" with a bar coloured by how full it is; "3 · unlimited" without a limit.
 *
 * @param {{ used: number | null | undefined, max: number | null | undefined, unit?: string, t: (key: string, values?: Record<string, unknown>) => string }} props
 */
function UsageCell({ used, max, unit = "", t }) {
  if (used == null) return <Typography.Text type="secondary">{"—"}</Typography.Text>;
  if (max == null) {
    return (
      <span className="whitespace-nowrap">
        {used}
        {unit} <Typography.Text type="secondary">· {t("unlimited")}</Typography.Text>
      </span>
    );
  }
  const percent = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 100;
  const full = used >= max;
  return (
    <div className="min-w-0">
      <Typography.Text type={full ? "danger" : undefined} className="whitespace-nowrap">
        {used}
        {unit} / {max}
        {unit}
      </Typography.Text>
      <Progress
        percent={percent}
        size="small"
        showInfo={false}
        status={full ? "exception" : "normal"}
        strokeColor={!full && percent >= 80 ? "var(--ant-color-warning)" : undefined}
      />
    </div>
  );
}

/**
 * @param {(key: string, values?: Record<string, unknown>) => string} t `useTranslations("CentralUsage")`
 * @param {(key: string) => string} tTenants `useTranslations("CentralTenants")` for the status tag
 * @param {{ onRefresh?: (row: Record<string, any>) => void, refreshingId?: string | null }} [actions]
 * @returns {import("antd").TableProps["columns"]}
 */
export function getUsageTableColumns(t, tTenants, actions = {}) {
  const { onRefresh, refreshingId } = actions;
  return [
    {
      title: t("colTenant"),
      key: "tenant",
      width: 210,
      fixed: "start",
      sorter: (a, b) => String(a.name ?? a.id).localeCompare(String(b.name ?? b.id), undefined, { sensitivity: "base" }),
      render: (_v, r) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{r.name || r.id}</div>
          <Typography.Text type="secondary" className="block truncate text-xs">
            {r.primary_domain || r.id}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: t("colStatus"),
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (value) => renderTenantStatus(value, tTenants),
    },
    {
      title: t("colPlan"),
      key: "plan",
      width: 130,
      ellipsis: true,
      render: (_v, r) => r.plan?.name ?? <Typography.Text type="secondary">{"—"}</Typography.Text>,
    },
    {
      title: t("colUsers"),
      key: "users",
      width: 130,
      sorter: (a, b) => usageNum(a, "users") - usageNum(b, "users"),
      render: (_v, r) => (
        <Tooltip title={r.usage ? t("usersTotalTooltip", { total: r.usage.users_total }) : undefined}>
          <div>
            <UsageCell used={r.usage?.users} max={r.limits?.users} t={t} />
          </div>
        </Tooltip>
      ),
    },
    {
      title: t("colBranches"),
      key: "branches",
      width: 120,
      sorter: (a, b) => usageNum(a, "branches") - usageNum(b, "branches"),
      render: (_v, r) => <UsageCell used={r.usage?.branches} max={r.limits?.branches} t={t} />,
    },
    {
      title: t("colWarehouses"),
      key: "warehouses",
      width: 120,
      sorter: (a, b) => usageNum(a, "warehouses") - usageNum(b, "warehouses"),
      render: (_v, r) => <UsageCell used={r.usage?.warehouses} max={r.limits?.warehouses} t={t} />,
    },
    {
      title: t("colStorage"),
      key: "storage",
      width: 150,
      sorter: (a, b) => usageNum(a, "storage_mb") - usageNum(b, "storage_mb"),
      render: (_v, r) => <UsageCell used={r.usage?.storage_mb} max={r.limits?.storage_mb} unit={` ${t("mb")}`} t={t} />,
    },
    {
      title: t("colInvoicesMonth"),
      key: "invoices",
      width: 130,
      sorter: (a, b) =>
        usageNum(a, "sales_invoices_month") + usageNum(a, "purchase_invoices_month") -
        (usageNum(b, "sales_invoices_month") + usageNum(b, "purchase_invoices_month")),
      render: (_v, r) =>
        r.usage ? (
          <span className="whitespace-nowrap">
            <Tooltip title={t("salesInvoices")}>
              <Tag color="green" className="!m-0">
                {r.usage.sales_invoices_month}
              </Tag>
            </Tooltip>{" "}
            <Tooltip title={t("purchaseInvoices")}>
              <Tag color="blue" className="!m-0">
                {r.usage.purchase_invoices_month}
              </Tag>
            </Tooltip>
          </span>
        ) : (
          <Typography.Text type="secondary">{"—"}</Typography.Text>
        ),
    },
    {
      title: t("colLastActivity"),
      key: "last_activity",
      width: 150,
      sorter: (a, b) =>
        Date.parse(a.usage?.last_activity_at ?? "1970-01-01") - Date.parse(b.usage?.last_activity_at ?? "1970-01-01"),
      render: (_v, r) =>
        r.usage?.last_activity_at ? (
          formatTenantDateTime(r.usage.last_activity_at)
        ) : (
          <Typography.Text type="secondary">{r.usage ? t("never") : "—"}</Typography.Text>
        ),
    },
    {
      title: t("colUpdated"),
      key: "computed_at",
      width: 150,
      render: (_v, r) =>
        r.usage?.computed_at ? (
          <Typography.Text type="secondary" className="text-xs">
            {formatTenantDateTime(r.usage.computed_at)}
          </Typography.Text>
        ) : (
          <Typography.Text type="secondary" className="text-xs">
            {t("notCollected")}
          </Typography.Text>
        ),
    },
    ...(onRefresh
      ? [
          {
            title: "",
            key: "actions",
            width: 52,
            fixed: /** @type {const} */ ("end"),
            align: /** @type {const} */ ("center"),
            render: (_v, r) => (
              <Tooltip title={t("refreshRow")}>
                <Button
                  type="text"
                  size="small"
                  icon={<ReloadOutlined />}
                  loading={refreshingId === r.id}
                  aria-label={t("refreshRow")}
                  onClick={() => onRefresh(r)}
                />
              </Tooltip>
            ),
          },
        ]
      : []),
  ];
}
