"use client";

import { useCentralResourceAccess } from "@/lib/central-permissions";
import { usePageDrawer } from "@/lib/drawer/usePageDrawer";
import AppDataTable from "@/shared/components/tables/AppDataTable";
import { App, Select, Spin } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useMemo, useState } from "react";
import { getTenantTableColumns } from "../components/TenantTable/getTenantTableColumns";
import { useTenantsTableQuery } from "../queries/useTenantsTableQuery";
import { TENANT_STATUS_ACTIVE, TENANT_STATUS_SUSPENDED } from "../utils/tenantDrawerUtils";

function TenantsTable() {
  const t = useTranslations("CentralTenants");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification } = App.useApp();
  const access = useCentralResourceAccess("tenants");
  const [status, setStatus] = useState(/** @type {string | null} */ (null));

  const { tableData, isPending, isFetching, refetch, pagination, onSearchChange } = useTenantsTableQuery({
    status,
    t,
    tApiErrors,
    notification,
  });

  const { openCreateDrawer, openEditDrawer, openViewDrawer } = usePageDrawer("centralTenants");

  const columns = useMemo(
    () =>
      getTenantTableColumns(t, {
        onEdit: access.canEdit ? openEditDrawer : undefined,
        onView: access.canView ? openViewDrawer : undefined,
      }),
    [t, access.canEdit, access.canView, openEditDrawer, openViewDrawer],
  );

  const statusOptions = useMemo(
    () => [
      { value: TENANT_STATUS_ACTIVE, label: t("statusActive") },
      { value: TENANT_STATUS_SUSPENDED, label: t("statusSuspended") },
    ],
    [t],
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="central-tenants"
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
          showAdd: access.canAdd,
          onAdd: openCreateDrawer,
          showRefresh: true,
          onRefresh: () => refetch(),
          showExportExcel: false,
          showExportPdf: false,
          showImportExcel: false,
          extra: (
            <Select
              allowClear
              size="small"
              className="min-w-36"
              placeholder={t("filterAllStatuses")}
              aria-label={t("filterStatus")}
              value={status ?? undefined}
              onChange={(value) => setStatus(value ?? null)}
              options={statusOptions}
            />
          ),
        }}
        rowSelection={false}
        showSelectionBar={false}
        stickyHeader
        scrollX={1000}
        enableColumnDrag
        pagination={pagination}
      />
    </div>
  );
}

export default function TenantsPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <TenantsTable />
      </Suspense>
    </div>
  );
}
