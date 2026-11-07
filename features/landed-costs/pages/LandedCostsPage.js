"use client";

import AppDataTable from "@/shared/components/tables/AppDataTable";
import { usePageDrawer } from "@/lib/drawer/usePageDrawer";
import { useResourceAccess } from "@/lib/permissions";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { invalidateTenantListQueries } from "@/lib/tables/tenantListCache";
import { useDocumentPdfDownload } from "@/shared/hooks/useDocumentPdfDownload";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Spin } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useMemo } from "react";
import { deleteLandedCost, downloadLandedCostPdf, postLandedCost, reverseLandedCost } from "../api/landedCosts.api";
import { getLandedCostTableColumns } from "../components/LandedCostTable/getLandedCostTableColumns";
import { LANDED_COSTS_LIST_QUERY_KEY } from "../queries/landedCostsQueryKeys";
import { useLandedCostsTableQuery } from "../queries/useLandedCostsTableQuery";

function LandedCostsTable() {
  const t = useTranslations("LandedCosts");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification, modal, message } = App.useApp();
  const access = useResourceAccess("landed_costs");
  const queryClient = useQueryClient();
  const { openCreateDrawer, openEditDrawer, openViewDrawer } = usePageDrawer("landedCosts");
  const { tableData, isPending, isFetching, refetch, pagination, onSearchChange } = useLandedCostsTableQuery({
    t,
    tApiErrors,
    notification,
  });
  const { printPdf } = useDocumentPdfDownload({ download: downloadLandedCostPdf, errorTitle: t("actionError") });

  const actionMutation = useMutation({
    mutationFn: ({ id, action }) => (action === "post" ? postLandedCost(id) : action === "reverse" ? reverseLandedCost(id) : deleteLandedCost(id)),
    onSuccess: (_data, { action }) => {
      message.success(t(`${action}Success`));
      invalidateTenantListQueries(queryClient, LANDED_COSTS_LIST_QUERY_KEY);
    },
    onError: (err) => notification.error({ title: t("actionError"), description: getLocalizedApiErrorMessage(tApiErrors, err) }),
  });

  const confirmAction = (record, action) =>
    modal.confirm({
      title: t(`${action}ConfirmTitle`),
      content: t(`${action}ConfirmContent`),
      okText: t(action === "delete" ? "actionDelete" : action === "post" ? "actionPost" : "actionReverse"),
      okButtonProps: action === "post" ? undefined : { danger: true },
      cancelText: t("drawerCancel"),
      onOk: () => actionMutation.mutateAsync({ id: String(record.id), action }),
    });

  const columns = useMemo(
    () =>
      getLandedCostTableColumns(t, {
        onView: access.canView ? openViewDrawer : undefined,
        onEdit: access.canEdit ? openEditDrawer : undefined,
        onDelete: access.canDelete ? (record) => confirmAction(record, "delete") : undefined,
        onPost: access.canEdit ? (record) => confirmAction(record, "post") : undefined,
        onReverse: access.canReverse ? (record) => confirmAction(record, "reverse") : undefined,
        onPrint: access.canPrint ? (record) => printPdf(record.id, record.landed_cost_number) : undefined,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, access.canView, access.canEdit, access.canDelete, access.canReverse, access.canPrint, openViewDrawer, openEditDrawer, printPdf],
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="landed-costs"
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
        }}
        stickyHeader
        scrollX={1000}
        enableColumnDrag
        pagination={pagination}
      />
    </div>
  );
}

export default function LandedCostsPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <LandedCostsTable />
      </Suspense>
    </div>
  );
}
