"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useCentralResourceAccess } from "@/lib/central-permissions";
import { invalidateTenantListQueries, patchTenantListCache } from "@/lib/tables/tenantListCache";
import AppDataTable from "@/shared/components/tables/AppDataTable";
import { SyncOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Button, Select, Spin, Typography } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useMemo, useState } from "react";
import { refreshAllTenantUsage, refreshTenantUsage } from "../api/usage.api";
import { getUsageTableColumns } from "../components/getUsageTableColumns";
import { CENTRAL_TENANT_USAGE_QUERY_KEY } from "../queries/usageQueryKeys";
import { useTenantUsageTableQuery } from "../queries/useTenantUsageTableQuery";

/**
 * Every tenant's usage against its plan limits. Collected hourly on the server;
 * "Recalculate now" (tenant_usage,edit) collects it immediately.
 */
function TenantUsageTable() {
  const t = useTranslations("CentralUsage");
  const tTenants = useTranslations("CentralTenants");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification, message } = App.useApp();
  const queryClient = useQueryClient();
  const access = useCentralResourceAccess("tenant_usage");
  const [status, setStatus] = useState(/** @type {string | null} */ (null));

  const { tableData, isPending, isFetching, refetch, pagination, onSearchChange } = useTenantUsageTableQuery({
    status,
    t,
    tApiErrors,
    notification,
  });

  const refreshAll = useMutation({
    mutationFn: refreshAllTenantUsage,
    onSuccess: (data) => {
      const failed = Array.isArray(data?.failed) ? data.failed : [];
      if (failed.length) {
        notification.warning({ title: t("refreshPartial", { count: failed.length }), description: failed.join(", ") });
      } else {
        message.success(t("refreshDone", { count: Number(data?.refreshed ?? 0) }));
      }
    },
    onError: (err) => message.error(getLocalizedApiErrorMessage(tApiErrors, err)),
    onSettled: () => invalidateTenantListQueries(queryClient, CENTRAL_TENANT_USAGE_QUERY_KEY),
  });

  const refreshOne = useMutation({
    mutationFn: (/** @type {string} */ tenantId) => refreshTenantUsage(tenantId),
    onSuccess: (row) => {
      if (row && typeof row === "object") {
        patchTenantListCache(queryClient, CENTRAL_TENANT_USAGE_QUERY_KEY, (rows) =>
          rows.map((r) => (r.id === row.id ? row : r)),
        );
      }
    },
    onError: (err) => message.error(getLocalizedApiErrorMessage(tApiErrors, err)),
  });

  const columns = useMemo(
    () =>
      getUsageTableColumns(t, tTenants, {
        onRefresh: access.canEdit ? (row) => refreshOne.mutate(String(row.id)) : undefined,
        refreshingId: refreshOne.isPending ? refreshOne.variables : null,
      }),
    [t, tTenants, access.canEdit, refreshOne],
  );

  const statusOptions = useMemo(
    () => [
      { value: "active", label: tTenants("statusActive") },
      { value: "suspended", label: tTenants("statusSuspended") },
    ],
    [tTenants],
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      <Typography.Text type="secondary" className="px-1 text-xs">
        {t("hint")}
      </Typography.Text>
      <AppDataTable
        tableId="central-tenant-usage"
        columns={columns}
        dataSource={tableData}
        rowKey="id"
        loading={isPending}
        refreshFetching={isFetching}
        onRetry={() => refetch()}
        emptyText={t("empty")}
        toolbar={{
          showSearch: true,
          enableClientSearch: false,
          onSearchChange,
          showAdd: false,
          showRefresh: true,
          onRefresh: () => refetch(),
          showExportExcel: false,
          showExportPdf: false,
          showImportExcel: false,
          extra: (
            <>
              <Select
                allowClear
                size="small"
                className="min-w-36"
                placeholder={tTenants("filterAllStatuses")}
                aria-label={tTenants("filterStatus")}
                value={status ?? undefined}
                onChange={(value) => setStatus(value ?? null)}
                options={statusOptions}
              />
              {access.canEdit ? (
                <Button
                  size="small"
                  icon={<SyncOutlined />}
                  loading={refreshAll.isPending}
                  onClick={() => refreshAll.mutate()}
                >
                  {t("refreshAll")}
                </Button>
              ) : null}
            </>
          ),
        }}
        stickyHeader
        scrollX={1450}
        enableColumnDrag
        pagination={pagination}
      />
    </div>
  );
}

export default function TenantUsagePage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <TenantUsageTable />
      </Suspense>
    </div>
  );
}
