"use client";

import AppDataTable from "@/components/tables/AppDataTable";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useTenantListBulkDelete } from "@/lib/tables/useTenantListBulkDelete";
import { deleteUnitOfMeasurement, fetchUnitOfMeasurements } from "@/services/unitOfMeasurementsApi";
import UnitOfMeasurementDrawer from "./drawer/UnitOfMeasurementDrawer";
import {
  getUnitOfMeasurementDimensionTypeLabel,
  getUnitOfMeasurementStatusLabel,
  getUnitOfMeasurementTableColumns,
} from "./getUnitOfMeasurementTableColumns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function getUnitGroupName(row) {
  const name = row?.unit_group?.name;
  return typeof name === "string" ? name.trim() : "";
}

function getUnitGroupCode(row) {
  const code = row?.unit_group?.code;
  return typeof code === "string" ? code.trim() : "";
}

function getUnitGroupDimensionType(row) {
  const value = row?.unit_group?.dimension_type;
  return typeof value === "string" ? value.trim() : "";
}

const hasValue = (value) => value !== null && typeof value !== "undefined";
const normalizeText = (value) =>
  typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").toLocaleLowerCase()
    : "";

function UnitOfMeasurementsTable() {
  const t = useTranslations("UnitOfMeasurements");
  const tApiErrors = useTranslations("ApiErrors");
  const tDataTable = useTranslations("DataTable");
  const { notification, modal, message } = App.useApp();
  const queryClient = useQueryClient();
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedUnitGroupId, setSelectedUnitGroupId] = useState();
  const {
    data = [],
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["tenant", "unit-of-measurements"],
    queryFn: fetchUnitOfMeasurements,
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
      data.map((row) => {
        const unitGroupDimensionType = getUnitGroupDimensionType(row);

        return {
          ...row,
          unit_group_name: getUnitGroupName(row),
          unit_group_code: getUnitGroupCode(row),
          unit_group_dimension_type: unitGroupDimensionType,
          unit_group_dimension_type_label:
            getUnitOfMeasurementDimensionTypeLabel(
              unitGroupDimensionType,
              t,
            ),
          is_active_label: getUnitOfMeasurementStatusLabel(row?.is_active, t),
        };
      }),
    [data, t],
  );

  const unitGroupOptions = useMemo(() => {
    const optionsById = new Map();

    for (const row of tableData) {
      const unitGroupId = row?.unit_group_id;
      if (!hasValue(unitGroupId)) continue;

      const value = String(unitGroupId);
      if (optionsById.has(value)) continue;

      const name = row.unit_group_name;
      const code = row.unit_group_code;
      const dimensionTypeLabel = row.unit_group_dimension_type_label;
      optionsById.set(value, {
        value,
        id: unitGroupId,
        name,
        code,
        dimensionTypeLabel,
        normalizedText: normalizeText(
          [name, code, row.unit_group_dimension_type, dimensionTypeLabel].join(" "),
        ),
      });
    }

    return [...optionsById.values()].sort((a, b) =>
      (a.name || a.code || String(a.id)).localeCompare(
        b.name || b.code || String(b.id),
      ),
    );
  }, [tableData]);

  const activeUnitGroupId = useMemo(() => {
    if (!selectedUnitGroupId) return undefined;
    return unitGroupOptions.some((option) => option.value === selectedUnitGroupId)
      ? selectedUnitGroupId
      : undefined;
  }, [selectedUnitGroupId, unitGroupOptions]);

  const filteredTableData = useMemo(() => {
    if (!activeUnitGroupId) return tableData;
    return tableData.filter(
      (row) => String(row?.unit_group_id) === activeUnitGroupId,
    );
  }, [activeUnitGroupId, tableData]);

  const handleUnitGroupFilterChange = useCallback((value) => {
    setSelectedUnitGroupId(value);
    setSelectedRowKeys([]);
  }, []);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState(/** @type {"create" | "edit" | "view"} */ ("create"));
  const [drawerUnitOfMeasurementId, setDrawerUnitOfMeasurementId] = useState(/** @type {number | null} */ (null));
  const [drawerTableSeed, setDrawerTableSeed] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const drawerSessionRef = useRef({
    open: false,
    unitOfMeasurementId: /** @type {number | null} */ (null),
  });
  useEffect(() => {
    drawerSessionRef.current = { open: drawerOpen, unitOfMeasurementId: drawerUnitOfMeasurementId };
  }, [drawerOpen, drawerUnitOfMeasurementId]);

  const openCreateDrawer = useCallback(() => {
    setDrawerTableSeed(null);
    setDrawerMode("create");
    setDrawerUnitOfMeasurementId(null);
    setDrawerOpen(true);
  }, []);

  const openEditDrawer = useCallback((record) => {
    const id = record?.id;
    if (id == null) return;
    setDrawerTableSeed(record && typeof record === "object" ? { ...record } : null);
    setDrawerMode("edit");
    setDrawerUnitOfMeasurementId(Number(id));
    setDrawerOpen(true);
  }, []);

  const openViewDrawer = useCallback((record) => {
    const id = record?.id;
    if (id == null) return;
    setDrawerTableSeed(record && typeof record === "object" ? { ...record } : null);
    setDrawerMode("view");
    setDrawerUnitOfMeasurementId(Number(id));
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setDrawerUnitOfMeasurementId(null);
    setDrawerTableSeed(null);
  }, []);

  const handleUnitOfMeasurementCreated = useCallback((record) => {
    const id = record?.id;
    if (id == null) return;
    setDrawerTableSeed(record && typeof record === "object" ? { ...record } : null);
    setDrawerMode("edit");
    setDrawerUnitOfMeasurementId(Number(id));
  }, []);

  const deleteMutation = useMutation({
    mutationFn: (/** @type {number} */ id) => deleteUnitOfMeasurement(id),
    onMutate: async (id) => {
      const listKey = ["tenant", "unit-of-measurements"];
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData(listKey);
      queryClient.setQueryData(listKey, (old) => (Array.isArray(old) ? old.filter((row) => row.id !== id) : old));
      return { previous };
    },
    onError: (err, _id, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["tenant", "unit-of-measurements"], context.previous);
      }
      notification.error({
        title: t("deleteError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    },
    onSuccess: (_data, deletedId) => {
      message.success(t("deleteSuccess"));
      queryClient.removeQueries({ queryKey: ["tenant", "unit-of-measurements", deletedId] });
      const { open, unitOfMeasurementId } = drawerSessionRef.current;
      if (open && unitOfMeasurementId === deletedId) {
        closeDrawer();
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", "unit-of-measurements"] });
    },
  });

  const { openBulkDeleteConfirm, bulkDeletePending } = useTenantListBulkDelete({
    listQueryKey: ["tenant", "unit-of-measurements"],
    deleteOne: deleteUnitOfMeasurement,
    message,
    notification,
    modal,
    tDataTable,
    tEntity: t,
    tApiErrors,
    selectedRowKeys,
    setSelectedRowKeys,
    getOpenRecordId: () => drawerSessionRef.current.unitOfMeasurementId,
    closeDrawer,
  });

  const requestDeleteUnitOfMeasurement = useCallback(
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
      getUnitOfMeasurementTableColumns(t, {
        onView: openViewDrawer,
        onEdit: openEditDrawer,
        onDelete: requestDeleteUnitOfMeasurement,
        unitGroupFilter: {
          options: unitGroupOptions,
          value: activeUnitGroupId,
          onChange: handleUnitGroupFilterChange,
        },
      }),
    [
      activeUnitGroupId,
      handleUnitGroupFilterChange,
      openEditDrawer,
      openViewDrawer,
      requestDeleteUnitOfMeasurement,
      t,
      unitGroupOptions,
    ],
  );

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    columnWidth: 48,
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="unit-of-measurements"
        columns={columns}
        dataSource={filteredTableData}
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
            "symbol",
            "decimal_places",
            "unit_group_id",
            "unit_group_name",
            "unit_group_code",
            "unit_group_dimension_type",
            "unit_group_dimension_type_label",
            "is_active_label",
          ],
          showAdd: true,
          onAdd: openCreateDrawer,
          showRefresh: true,
          onRefresh: () => refetch(),
        }}
        rowSelection={rowSelection}
        showSelectionBar
        onBulkDelete={openBulkDeleteConfirm}
        bulkDeleteLoading={bulkDeletePending}
        stickyHeader
        scrollX={1660}
        enableColumnDrag
        pagination={{
          mode: "client",
          pageSize: 20,
          pageSizeOptions: [10, 20, 50],
        }}
      />
      <UnitOfMeasurementDrawer
        open={drawerOpen}
        mode={drawerMode}
        unitOfMeasurementId={drawerUnitOfMeasurementId}
        tableSeedRecord={drawerTableSeed}
        onClose={closeDrawer}
        onCreated={handleUnitOfMeasurementCreated}
      />
    </div>
  );
}

export default function UnitOfMeasurementsPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <UnitOfMeasurementsTable />
    </div>
  );
}
