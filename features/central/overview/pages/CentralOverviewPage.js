"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useCentralPermissions } from "@/lib/central-permissions";
import { formatTenantDate, formatTenantDateTime } from "@/lib/tenant-format";
import { Link } from "@/i18n/navigation";
import { ReloadOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Empty, Progress, Spin, Statistic, Tag, Typography } from "antd";
import { useTranslations } from "next-intl";
import { CENTRAL_ROUTES } from "../../registry";
import { renderTenantStatus } from "../../tenants/components/TenantTable/getTenantTableColumns";
import { useCentralOverviewQuery } from "../queries/useOverviewQuery";

/** @param {unknown} value */
const toCount = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export default function CentralOverviewPage() {
  const t = useTranslations("CentralOverview");
  const tTenants = useTranslations("CentralTenants");
  const tApiErrors = useTranslations("ApiErrors");
  const { can } = useCentralPermissions();
  const { data, isPending, isError, error, isFetching, refetch } = useCentralOverviewQuery();

  const overview = data && typeof data === "object" ? /** @type {Record<string, any>} */ (data) : null;
  const tenants = overview?.tenants ?? {};
  const users = overview?.users ?? {};
  const totalTenants = toCount(tenants.total);

  const modules = Array.isArray(overview?.modules) ? overview.modules : [];
  const recentTenants = Array.isArray(overview?.recent_tenants) ? overview.recent_tenants : [];

  if (isPending) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <Spin />
      </div>
    );
  }

  if (isError || !overview) {
    return (
      <div className="p-4">
        <Alert
          type="error"
          showIcon
          title={t("loadError")}
          description={getLocalizedApiErrorMessage(tApiErrors, error)}
          action={
            <Button size="small" onClick={() => refetch()}>
              {t("retry")}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Typography.Text type="secondary" className="text-sm">
          {t("generatedAt", { time: formatTenantDateTime(overview.generated_at) || "\u2014" })}
        </Typography.Text>
        <Button icon={<ReloadOutlined />} loading={isFetching} onClick={() => refetch()}>
          {t("refresh")}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <Statistic title={t("statTenantsTotal")} value={totalTenants} />
        </Card>
        <Card>
          <Statistic
            title={t("statTenantsActive")}
            value={toCount(tenants.active)}
            styles={{ content: { color: "var(--ant-color-success)" } }}
          />
        </Card>
        <Card>
          <Statistic
            title={t("statTenantsSuspended")}
            value={toCount(tenants.suspended)}
            styles={{ content: { color: "var(--ant-color-error)" } }}
          />
        </Card>
        <Card>
          <Statistic title={t("statTenantsNew")} value={toCount(tenants.created_last_30_days)} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card
          title={t("recentTenants")}
          className="xl:col-span-2"
          extra={
            can("tenants", "view") ? <Link href={CENTRAL_ROUTES.centralTenants}>{t("viewAll")}</Link> : null
          }
        >
          {recentTenants.length === 0 ? (
            <Empty description={t("recentTenantsEmpty")} />
          ) : (
            <ul className="m-0 flex list-none flex-col divide-y divide-[var(--ant-color-border-secondary)] p-0">
              {recentTenants.map((row) => (
                <li key={String(row.id)} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{row.name || row.id}</div>
                    <Typography.Text type="secondary" className="text-xs">
                      {row.primary_domain || "\u2014"} · {formatTenantDate(row.created_at) || "\u2014"}
                    </Typography.Text>
                  </div>
                  <div className="shrink-0">{renderTenantStatus(row.status, tTenants)}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={t("users")}>
          <div className="flex flex-col gap-4">
            <Statistic title={t("statUsersTotal")} value={toCount(users.total)} />
            <Statistic title={t("statUsersActive")} value={toCount(users.active)} />
            {can("users", "view") ? <Link href={CENTRAL_ROUTES.centralUsers}>{t("manageUsers")}</Link> : null}
          </div>
        </Card>
      </div>

      <Card
        title={t("moduleAdoption")}
        extra={
          can("modules", "view") ? <Link href={CENTRAL_ROUTES.centralModules}>{t("viewAll")}</Link> : null
        }
      >
        {modules.length === 0 ? (
          <Empty description={t("modulesEmpty")} />
        ) : (
          <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
            {modules.map((m) => {
              const count = toCount(m.tenants_count);
              const percent = totalTenants > 0 ? Math.round((count / totalTenants) * 100) : 0;
              return (
                <div key={m.code} className="min-w-0">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">
                      {m.name || m.code}
                      {m.is_core ? (
                        <Tag className="ms-2" bordered={false}>
                          {t("coreTag")}
                        </Tag>
                      ) : null}
                    </span>
                    <Typography.Text type="secondary" className="shrink-0 text-xs">
                      {t("moduleTenantsCount", { count, total: totalTenants })}
                    </Typography.Text>
                  </div>
                  <Progress percent={percent} size="small" />
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
