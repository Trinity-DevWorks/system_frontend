"use client";

import AppDataTable from "@/shared/components/tables/AppDataTable";
import { usePageDrawer } from "@/lib/drawer/usePageDrawer";
import { useResourceAccess } from "@/lib/permissions";
import { useTreasuryTransfersDelete } from "../queries/useTreasuryTransfersDelete";
import { useTreasuryTransfersTableQuery } from "../queries/useTreasuryTransfersTableQuery";
import { getTreasuryTransferTableColumns } from "../components/TreasuryTransferTable/getTreasuryTransferTableColumns";
import { App, Spin } from "antd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { invalidateTenantListQueries } from "@/lib/tables/tenantListCache";
import { postTreasuryTransfer, reverseTreasuryTransfer } from "../api/treasuryTransfers.api";
import { TREASURY_TRANSFERS_LIST_QUERY_KEY } from "../queries/treasuryTransfersQueryKeys";
import { useTranslations } from "next-intl";
import { Suspense, useMemo, useState } from "react";

function TreasuryTransfersTable() {
  const t = useTranslations("TreasuryTransfers");
  const tApiErrors = useTranslations("ApiErrors");
  const tDataTable = useTranslations("DataTable");
  const { notification, modal, message } = App.useApp();
  const access = useResourceAccess("treasury_transfers");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const { tableData, isPending, isFetching, refetch, pagination, onSearchChange } = useTreasuryTransfersTableQuery({
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
  } = usePageDrawer("treasuryTransfers");

  const { requestDeleteTreasuryTransfer, openBulkDeleteConfirm, bulkDeletePending } = useTreasuryTransfersDelete({
    t,
    tApiErrors,
    tDataTable,
    notification,
    message,
    modal,
    selectedRowKeys,
    setSelectedRowKeys,
    getOpenDrawerRecordId: getOpenRecordId,
    closeDrawer,
  });

  const queryClient = useQueryClient();
  const actionMutation = useMutation({
    mutationFn: ({ id, action }) => (action === "post" ? postTreasuryTransfer(id) : reverseTreasuryTransfer(id)),
    onSuccess: (_data, { action }) => {
      message.success(action === "post" ? t("postSuccess") : t("reverseSuccess"));
      invalidateTenantListQueries(queryClient, TREASURY_TRANSFERS_LIST_QUERY_KEY);
      queryClient.invalidateQueries({ queryKey: ["tenant", "cash-bank-accounts"] });
    },
    onError: (err) => {
      notification.error({ title: t("actionError"), description: getLocalizedApiErrorMessage(tApiErrors, err) });
    },
  });
  const confirmAction = (record, action) =>
    modal.confirm({
      title: action === "post" ? t("postConfirmTitle") : t("reverseConfirmTitle"),
      content: action === "post" ? t("postConfirmContent") : t("reverseConfirmContent"),
      okText: action === "post" ? t("actionPost") : t("actionReverse"),
      okButtonProps: action === "reverse" ? { danger: true } : undefined,
      cancelText: t("drawerCancel"),
      onOk: () => actionMutation.mutateAsync({ id: String(record.id), action }),
    });

  const columns = useMemo(
    () =>
      getTreasuryTransferTableColumns(t, {
        onView: access.canView ? openViewDrawer : undefined,
        onEdit: access.canEdit ? openEditDrawer : undefined,
        onDelete: access.canDelete ? requestDeleteTreasuryTransfer : undefined,
        onPost: access.canEdit ? (record) => confirmAction(record, "post") : undefined,
        onReverse: access.canReverse ? (record) => confirmAction(record, "reverse") : undefined,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, access.canView, access.canEdit, access.canDelete, access.canReverse, openViewDrawer, openEditDrawer, requestDeleteTreasuryTransfer],
  );

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    columnWidth: 48,
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="treasury-transfers"
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
        scrollX={1080}
        enableColumnDrag
        pagination={pagination}
      />
    </div>
  );
}

export default function TreasuryTransfersPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <TreasuryTransfersTable />
      </Suspense>
    </div>
  );
}
