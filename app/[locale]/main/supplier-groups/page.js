"use client";

import AppDataTable from "@/components/tables/AppDataTable";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useResourceDrawerUrl } from "@/lib/drawer/useResourceDrawerUrl";
import { useResourceAccess } from "@/lib/permissions";
import { parseNumericEntityId } from "@/lib/entityId";
import { useTenantListBulkDelete } from "@/lib/tables/useTenantListBulkDelete";
import { deleteSupplierGroup, fetchSupplierGroups } from "@/services/supplierGroupsApi";
import SupplierGroupDrawer from "./drawer/SupplierGroupDrawer";
import { getSupplierGroupStatusLabel, getSupplierGroupTableColumns } from "./getSupplierGroupTableColumns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Spin } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

function SupplierGroupsTable() {
  const t = useTranslations("SupplierGroups");
  const tApiErrors = useTranslations("ApiErrors");
  const tDataTable = useTranslations("DataTable");
  const { notification, modal, message } = App.useApp();
  const queryClient = useQueryClient();
  const access = useResourceAccess("supplier_groups");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const {
    data = [],
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["tenant", "supplier-groups"],
    queryFn: fetchSupplierGroups,
    staleTime: 5 * 60_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!isError || !error) return;
    notification.error({
      title: t("loadError"),
      description: getLocalizedApiErrorMessage(tApiErrors, error),
    });
  }, [isError, error, notification, t, tApiErrors]);

  const tableData = useMemo(
    () =>
      data.map((row) => ({
        ...row,
        is_active_label: getSupplierGroupStatusLabel(row?.is_active, t),
      })),
    [data, t],
  );

  const {
    open: drawerOpen,
    mode: drawerMode,
    recordId: drawerSupplierGroupId,
    tableSeed: drawerTableSeed,
    openCreateDrawer,
    openEditDrawer,
    openViewDrawer,
    closeDrawer,
    promoteCreated: handleSupplierGroupCreated,
    sessionRef: drawerSessionRef,
  } = useResourceDrawerUrl({ parseId: parseNumericEntityId });

  const deleteMutation = useMutation({
    mutationFn: (/** @type {number} */ id) => deleteSupplierGroup(id),
    onMutate: async (id) => {
      const listKey = ["tenant", "supplier-groups"];
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData(listKey);
      queryClient.setQueryData(listKey, (old) =>
        Array.isArray(old) ? old.filter((row) => row.id !== id) : old,
      );
      return { previous };
    },
    onError: (err, _id, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["tenant", "supplier-groups"], context.previous);
      }
      notification.error({
        title: t("deleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: (_data, deletedId) => {
      message.success(t("deleteSuccess"));
      queryClient.removeQueries({ queryKey: ["tenant", "supplier-groups", deletedId] });
      const { open, recordId } = drawerSessionRef.current;
      if (open && recordId != null && Number(recordId) === Number(deletedId)) {
        closeDrawer();
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", "supplier-groups"] });
    },
  });

  const { openBulkDeleteConfirm, bulkDeletePending } = useTenantListBulkDelete({
    listQueryKey: ["tenant", "supplier-groups"],
    deleteOne: deleteSupplierGroup,
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

  const requestDeleteSupplierGroup = useCallback(
    (record) => {
      const id = record?.id;
      if (id == null) return;
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
    [deleteMutation, modal, t],
  );

  const columns = useMemo(
    () =>
      getSupplierGroupTableColumns(t, {
        onView: access.canView ? openViewDrawer : undefined,
        onEdit: access.canEdit ? openEditDrawer : undefined,
        onDelete: access.canDelete ? requestDeleteSupplierGroup : undefined,
      }),
    [t, access.canView, access.canEdit, access.canDelete, openViewDrawer, openEditDrawer, requestDeleteSupplierGroup],
  );

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    columnWidth: 48,
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="supplier-groups"
        columns={columns}
        dataSource={tableData}
        rowKey="id"
        loading={isPending}
        refreshFetching={isFetching}
        onRetry={() => refetch()}
        emptyText={t("empty")}
        toolbar={{
          showSearch: true,
          searchKeys: ["id", "code", "name", "is_active_label"],
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
        scrollX={1080}
        enableColumnDrag
        pagination={{
          mode: "client",
          pageSize: 20,
          pageSizeOptions: [10, 20, 50],
        }}
      />
      <SupplierGroupDrawer
        open={drawerOpen}
        mode={drawerMode}
        supplierGroupId={drawerSupplierGroupId == null ? null : Number(drawerSupplierGroupId)}
        tableSeedRecord={drawerTableSeed}
        onClose={closeDrawer}
        onCreated={handleSupplierGroupCreated}
      />
    </div>
  );
}

export default function SupplierGroupsPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <SupplierGroupsTable />
      </Suspense>
    </div>
  );
}
