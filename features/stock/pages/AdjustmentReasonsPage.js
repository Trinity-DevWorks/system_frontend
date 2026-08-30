"use client";

import AppDataTable from "@/shared/components/tables/AppDataTable";
import { usePageDrawer } from "@/lib/drawer/usePageDrawer";
import { useResourceAccess } from "@/lib/permissions";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { App, Spin } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useCallback, useMemo } from "react";
import { getAdjustmentReasonTableColumns } from "../components/AdjustmentReasonsTable/getAdjustmentReasonTableColumns";
import { useStockAdjustmentReasonMutations } from "../queries/useStockAdjustmentReasonMutations";
import { useStockAdjustmentReasonsTableQuery } from "../queries/useStockAdjustmentReasonsTableQuery";

function AdjustmentReasonsTable() {
  const t = useTranslations("Stock");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification, modal, message } = App.useApp();
  const access = useResourceAccess("stock");

  const { tableData, isPending, isFetching, refetch, pagination, onSearchChange } =
    useStockAdjustmentReasonsTableQuery({
      t,
      tApiErrors,
      notification,
    });

  const {
    openCreateDrawer,
    openEditDrawer,
    openViewDrawer,
    closeDrawer,
    getOpenRecordId,
  } = usePageDrawer("stockAdjustmentReasons");

  const { deleteMutation } = useStockAdjustmentReasonMutations({
    message,
    notification,
    t,
    tApiErrors,
    onDeleted: closeDrawer,
  });

  const handleDelete = useCallback(
    (record) => {
      if (record?.is_system) return;
      const id = Number(record?.id);
      if (!Number.isFinite(id)) return;
      modal.confirm({
        title: t("adjReasonDeleteConfirmTitle"),
        content: t("adjReasonDeleteConfirmContent", { name: record?.name ?? record?.code ?? id }),
        okText: t("adjDeleteConfirmOk"),
        okButtonProps: { danger: true },
        cancelText: t("drawerCancel"),
        onOk: () => deleteMutation.mutateAsync(id),
      });
    },
    [modal, t, deleteMutation],
  );

  const columns = useMemo(
    () =>
      getAdjustmentReasonTableColumns(t, {
        onView: access.canView ? openViewDrawer : undefined,
        onEdit: access.canEdit ? openEditDrawer : undefined,
        onDelete: access.canDelete ? handleDelete : undefined,
      }),
    [t, access.canView, access.canEdit, access.canDelete, openViewDrawer, openEditDrawer, handleDelete],
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="stock-adjustment-reasons"
        columns={columns}
        dataSource={tableData}
        rowKey="id"
        loading={isPending}
        refreshFetching={isFetching}
        onRetry={() => refetch()}
        emptyText={t("adjustmentReasonsEmpty")}
        toolbar={{
          showSearch: true,
          enableClientSearch: false,
          onSearchChange,
          showRefresh: true,
          onRefresh: () => refetch(),
          showAdd: access.canAdd,
          onAdd: openCreateDrawer,
          addLabel: t("toolbarNewAdjReason"),
        }}
        stickyHeader
        scrollX={980}
        pagination={pagination}
      />
    </div>
  );
}

export default function AdjustmentReasonsPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <AdjustmentReasonsTable />
      </Suspense>
    </div>
  );
}
