"use client";

import AppDataTable from "@/components/tables/AppDataTable";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useResourceDrawerUrl } from "@/lib/drawer/useResourceDrawerUrl";
import { useResourceAccess } from "@/lib/permissions";
import { parseNumericEntityId } from "@/lib/entityId";
import { useTenantListBulkDelete } from "@/lib/tables/useTenantListBulkDelete";
import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { deleteBranch, fetchBranches } from "@/services/branchesApi";
import BranchDrawer from "./drawer/BranchDrawer";
import {
  getBranchDefaultLabel,
  getBranchStatusLabel,
  getBranchTableColumns,
} from "./getBranchTableColumns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Spin } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useCallback, useMemo, useState } from "react";

function BranchesTable() {
  const t = useTranslations("Branches");
  const tApiErrors = useTranslations("ApiErrors");
  const tDataTable = useTranslations("DataTable");
  const { notification, modal, message } = App.useApp();
  const queryClient = useQueryClient();
  const access = useResourceAccess("branches");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const {
    rows,
    isPending,
    isFetching,
    refetch,
    pagination,
    onSearchChange,
  } = useTenantPaginatedTable({
    queryKey: ["tenant", "branches"],
    queryFn: fetchBranches,
    tableId: "branches",
    t,
    tApiErrors,
    notification,
  });

  const tableData = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        is_active_label: getBranchStatusLabel(row?.is_active, t),
        is_default_label: getBranchDefaultLabel(row?.is_default, t),
      })),
    [rows, t],
  );

  const {
    open: drawerOpen,
    mode: drawerMode,
    recordId: drawerBranchId,
    tableSeed: drawerTableSeed,
    openCreateDrawer,
    openEditDrawer,
    openViewDrawer,
    closeDrawer,
    promoteCreated: handleBranchCreated,
    sessionRef: drawerSessionRef,
  } = useResourceDrawerUrl({ parseId: parseNumericEntityId });

  const deleteMutation = useMutation({
    mutationFn: (/** @type {number} */ id) => deleteBranch(id),
    onError: (err) => {
      notification.error({
        title: t("deleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: (_data, deletedId) => {
      message.success(t("deleteSuccess"));
      queryClient.removeQueries({ queryKey: ["tenant", "branches", deletedId] });
      const { open, recordId } = drawerSessionRef.current;
      if (open && recordId != null && Number(recordId) === Number(deletedId)) {
        closeDrawer();
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", "branches"] });
    },
  });

  const { openBulkDeleteConfirm, bulkDeletePending } = useTenantListBulkDelete({
    listQueryKey: ["tenant", "branches"],
    deleteOne: deleteBranch,
    message,
    notification,
    modal,
    tDataTable,
    tEntity: t,
    tApiErrors,
    selectedRowKeys,
    setSelectedRowKeys,
    getOpenRecordId: () => drawerSessionRef.current.recordId,
    closeDrawer,
  });

  const requestDeleteBranch = useCallback(
    (record) => {
      const id = record?.id;
      if (id == null) return;
      if (record?.is_default) {
        notification.error({
          title: t("deleteError"),
          description: t("deleteDefaultForbidden"),
        });
        return;
      }
      const name = typeof record?.name === "string" ? record.name : String(id);
      modal.confirm({
        title: t("deleteConfirmTitle"),
        content: t("deleteConfirmContent", { name }),
        okText: t("deleteConfirmOk"),
        okButtonProps: { danger: true },
        cancelText: t("deleteConfirmCancel"),
        onOk: async () => {
          try {
            await deleteMutation.mutateAsync(Number(id));
          } catch {
            // onError on mutation already shows feedback; resolve so confirm closes.
          }
        },
      });
    },
    [deleteMutation, modal, notification, t],
  );

  const columns = useMemo(
    () =>
      getBranchTableColumns(t, {
        onView: access.canView ? openViewDrawer : undefined,
        onEdit: access.canEdit ? openEditDrawer : undefined,
        onDelete: access.canDelete ? requestDeleteBranch : undefined,
      }),
    [t, access.canView, access.canEdit, access.canDelete, openViewDrawer, openEditDrawer, requestDeleteBranch],
  );

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    columnWidth: 48,
    getCheckboxProps: (record) => ({
      disabled: Boolean(record?.is_default),
    }),
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="branches"
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
        rowSelection={access.canDelete ? rowSelection : false}
        showSelectionBar={access.canDelete}
        onBulkDelete={access.canDelete ? openBulkDeleteConfirm : undefined}
        bulkDeleteLoading={bulkDeletePending}
        stickyHeader
        scrollX={1480}
        enableColumnDrag
        pagination={pagination}
      />
      <BranchDrawer
        open={drawerOpen}
        mode={drawerMode}
        branchId={drawerBranchId == null ? null : Number(drawerBranchId)}
        tableSeedRecord={drawerTableSeed}
        onClose={closeDrawer}
        onCreated={handleBranchCreated}
      />
    </div>
  );
}

export default function BranchesPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <BranchesTable />
      </Suspense>
    </div>
  );
}
