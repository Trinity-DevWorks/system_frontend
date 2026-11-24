"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { useQuery } from "@tanstack/react-query";
import { Alert, Empty, Spin, Tag, Typography } from "antd";
import { useMemo } from "react";
import { fetchCentralTenantModules } from "../../api/tenants.api";
import { centralTenantModulesQueryKey } from "../../queries/tenantsQueryKeys";
import { CORE_MODULE_CODE, sortModuleCatalog } from "../../utils/tenantDrawerUtils";

/**
 * Read-only module entitlements for one tenant: they always equal its plan's modules
 * (change them on the plan, or switch plans in the Subscription tab).
 *
 * @param {{
 *   tenantId: string;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 * }} props
 */
export default function TenantModulesTab({ tenantId, t, tApiErrors }) {
  const query = useQuery({
    queryKey: centralTenantModulesQueryKey(tenantId),
    queryFn: () => fetchCentralTenantModules(tenantId),
    staleTime: QUERY_STALE_TIME.default,
  });

  const assigned = useMemo(
    () => (Array.isArray(query.data?.modules) ? query.data.modules.map(String) : []),
    [query.data],
  );
  const catalog = useMemo(
    () => sortModuleCatalog(Array.isArray(query.data?.available) ? query.data.available : []),
    [query.data],
  );

  if (query.isPending) {
    return (
      <div className="flex min-h-32 items-center justify-center">
        <Spin />
      </div>
    );
  }

  if (query.isError) {
    return (
      <Alert
        type="error"
        showIcon
        title={t("modulesLoadError")}
        description={getLocalizedApiErrorMessage(tApiErrors, query.error)}
      />
    );
  }

  if (!catalog.length) {
    return <Empty description={t("modulesEmpty")} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <Alert type="info" showIcon title={t("modulesFromPlan")} />
      <div className="flex flex-col gap-2">
        {catalog.map((module) => {
          const code = String(module.code ?? "");
          const isCore = code === CORE_MODULE_CODE || Boolean(module.is_core);
          const enabled = isCore || assigned.includes(code);
          return (
            <div
              key={code}
              className="flex items-start gap-3 rounded-md border border-[var(--ant-color-border-secondary)] px-3 py-2"
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center gap-2">
                  <Typography.Text strong>{String(module.name ?? code)}</Typography.Text>
                  <Typography.Text type="secondary" code className="text-xs">
                    {code}
                  </Typography.Text>
                  {isCore ? <Tag className="!m-0">{t("modulesCoreTag")}</Tag> : null}
                  <Tag className="!m-0 ms-auto" color={enabled ? "green" : "default"} variant="outlined">
                    {enabled ? t("moduleIncluded") : t("moduleNotIncluded")}
                  </Tag>
                </div>
                {module.description ? (
                  <Typography.Text type="secondary" className="text-xs">
                    {String(module.description)}
                  </Typography.Text>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
