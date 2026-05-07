"use client";

import AppDataTable from "@/components/tables/AppDataTable";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { deleteUnitGroup, fetchUnitGroups } from "@/services/unitGroupsApi";
import UnitGroupDrawer from "./drawer/UnitGroupDrawer";
import {
  getUnitGroupDimensionTypeLabel,
  getUnitGroupStatusLabel,
  getUnitGroupTableColumns,
} from "./getUnitGroupTableColumns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function UnitGroupsTable() {
  const t = useTranslations("UnitGroups");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification, modal, message } = App.useApp();
  const queryClient = useQueryClient();
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const {
    data = [],
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["tenant", "unit-groups"],
    queryFn: fetchUnitGroups,
    staleTime: 5 * 60_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!isError || !error) return;
    notification.error({
      message: t("loadError"),
      description: getLocalizedApiErrorMessage(tApiErrors, error),
    });
  }, [isError, error, notification, t, tApiErrors]);

  const tableData = useMemo(
    () =>
      data.map((row) => ({
        ...row,
        dimension_type_label: getUnitGroupDimensionTypeLabel(
          row?.dimension_type,
          t,
        ),
        is_active_label: getUnitGroupStatusLabel(row?.is_active, t),
      })),
    [data, t],
  );

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState(/** @type {"create" | "edit" | "view"} */ ("create"));
  const [drawerUnitGroupId, setDrawerUnitGroupId] = useState(/** @type {number | null} */ (null));
  const [drawerTableSeed, setDrawerTableSeed] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const drawerSessionRef = useRef({ open: false, unitGroupId: /** @type {number | null} */ (null) });
  useEffect(() => {
    drawerSessionRef.current = { open: drawerOpen, unitGroupId: drawerUnitGroupId };
  }, [drawerOpen, drawerUnitGroupId]);

  const openCreateDrawer = useCallback(() => {
    setDrawerTableSeed(null);
    setDrawerMode("create");
    setDrawerUnitGroupId(null);
    setDrawerOpen(true);
  }, []);

  const openEditDrawer = useCallback((record) => {
    const id = record?.id;
    if (id == null) return;
    setDrawerTableSeed(record && typeof record === "object" ? { ...record } : null);
    setDrawerMode("edit");
    setDrawerUnitGroupId(Number(id));
    setDrawerOpen(true);
  }, []);

  const openViewDrawer = useCallback((record) => {
    const id = record?.id;
    if (id == null) return;
    setDrawerTableSeed(record && typeof record === "object" ? { ...record } : null);
    setDrawerMode("view");
    setDrawerUnitGroupId(Number(id));
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setDrawerUnitGroupId(null);
    setDrawerTableSeed(null);
  }, []);

  const handleUnitGroupCreated = useCallback((record) => {
    const id = record?.id;
    if (id == null) return;
    setDrawerTableSeed(record && typeof record === "object" ? { ...record } : null);
    setDrawerMode("edit");
    setDrawerUnitGroupId(Number(id));
  }, []);

  const deleteMutation = useMutation({
    mutationFn: (/** @type {number} */ id) => deleteUnitGroup(id),
    onMutate: async (id) => {
      const listKey = ["tenant", "unit-groups"];
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData(listKey);
      queryClient.setQueryData(listKey, (old) => (Array.isArray(old) ? old.filter((row) => row.id !== id) : old));
      return { previous };
    },
    onError: (err, _id, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["tenant", "unit-groups"], context.previous);
      }
      notification.error({
        message: t("deleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: (_data, deletedId) => {
      message.success(t("deleteSuccess"));
      queryClient.removeQueries({ queryKey: ["tenant", "unit-groups", deletedId] });
      const { open, unitGroupId } = drawerSessionRef.current;
      if (open && unitGroupId === deletedId) {
        closeDrawer();
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", "unit-groups"] });
    },
  });

  const requestDeleteUnitGroup = useCallback(
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
        onOk: () => deleteMutation.mutateAsync(Number(id)),
      });
    },
    [deleteMutation, modal, t],
  );

  const columns = useMemo(
    () =>
      getUnitGroupTableColumns(t, {
        onView: openViewDrawer,
        onEdit: openEditDrawer,
        onDelete: requestDeleteUnitGroup,
      }),
    [t, openViewDrawer, openEditDrawer, requestDeleteUnitGroup],
  );

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    columnWidth: 48,
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="unit-groups"
        columns={columns}
        dataSource={tableData}
        rowKey="id"
        loading={isPending}
        refreshFetching={isFetching}
        onRetry={() => refetch()}
        emptyText={t("empty")}
        toolbar={{
          showSearch: true,
          searchKeys: [
            "id",
            "code",
            "name",
            "dimension_type",
            "dimension_type_label",
            "is_active_label",
          ],
          showAdd: true,
          onAdd: openCreateDrawer,
          showRefresh: true,
          onRefresh: () => refetch(),
        }}
        rowSelection={rowSelection}
        showSelectionBar
        stickyHeader
        scrollX={1160}
        enableColumnDrag
        pagination={{
          mode: "client",
          pageSize: 20,
          pageSizeOptions: [10, 20, 50],
        }}
      />
      <UnitGroupDrawer
        open={drawerOpen}
        mode={drawerMode}
        unitGroupId={drawerUnitGroupId}
        tableSeedRecord={drawerTableSeed}
        onClose={closeDrawer}
        onCreated={handleUnitGroupCreated}
      />
    </div>
  );
}

export default function UnitGroupsPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <UnitGroupsTable />
    </div>
  );
}
