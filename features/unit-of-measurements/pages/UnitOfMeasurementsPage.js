"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";

import AppDataTable from "@/shared/components/tables/AppDataTable";
import { usePageDrawer } from "@/lib/drawer/usePageDrawer";
import { useResourceAccess } from "@/lib/permissions";
import { UNIT_GROUPS_LIST_QUERY_KEY, fetchUnitGroupNames } from "@/features/unit-groups";
import { useUnitOfMeasurementsDelete } from "../queries/useUnitOfMeasurementsDelete";
import { useUnitOfMeasurementsTableQuery } from "../queries/useUnitOfMeasurementsTableQuery";
import {
  getUnitOfMeasurementDimensionTypeLabel,
  getUnitOfMeasurementTableColumns,
} from "../components/UnitOfMeasurementTable/getUnitOfMeasurementTableColumns";
import { useQuery } from "@tanstack/react-query";
import { App, Spin } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useCallback, useMemo, useState } from "react";

const normalizeText = (value) =>
  typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").toLocaleLowerCase()
    : "";

function UnitOfMeasurementsTable() {
  const t = useTranslations("UnitOfMeasurements");
  const tApiErrors = useTranslations("ApiErrors");
  const tDataTable = useTranslations("DataTable");
  const { notification, modal, message } = App.useApp();
  const access = useResourceAccess("unit_of_measurements");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedUnitGroupId, setSelectedUnitGroupId] = useState();
  const extraParams = useMemo(
    () => (selectedUnitGroupId ? { unit_group_id: Number(selectedUnitGroupId) } : {}),
    [selectedUnitGroupId],
  );
  const { tableData, isPending, isFetching, refetch, pagination, onSearchChange } = useUnitOfMeasurementsTableQuery({
    t,
    tApiErrors,
    notification,
  });

  const unitGroupsQuery = useQuery({
    queryKey: UNIT_GROUPS_LIST_QUERY_KEY,
    queryFn: fetchUnitGroupNames,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const unitGroupOptions = useMemo(() => {
    const options = (unitGroupsQuery.data ?? [])
      .filter((group) => group && group.id != null)
      .map((group) => {
        const name = typeof group.name === "string" ? group.name.trim() : "";
        const code = typeof group.code === "string" ? group.code.trim() : "";
        const dimensionType = typeof group.dimension_type === "string" ? group.dimension_type.trim() : "";
        const dimensionTypeLabel = getUnitOfMeasurementDimensionTypeLabel(dimensionType, t);
        return {
          value: String(group.id),
          id: group.id,
          name,
          code,
          dimensionTypeLabel,
          normalizedText: normalizeText([name, code, dimensionType, dimensionTypeLabel].join(" ")),
        };
      });

    return options.sort((a, b) =>
      (a.name || a.code || String(a.id)).localeCompare(b.name || b.code || String(b.id)),
    );
  }, [t, unitGroupsQuery.data]);

  const handleUnitGroupFilterChange = useCallback((value) => {
    setSelectedUnitGroupId(value);
    setSelectedRowKeys([]);
  }, []);

  const {
    openCreateDrawer,
    openEditDrawer,
    openViewDrawer,
    closeDrawer,
    getOpenRecordId,
  } = usePageDrawer("unitOfMeasurements");

  const { requestDeleteUnitOfMeasurement, openBulkDeleteConfirm, bulkDeletePending } = useUnitOfMeasurementsDelete({
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

  const columns = useMemo(
    () =>
      getUnitOfMeasurementTableColumns(t, {
        onView: access.canView ? openViewDrawer : undefined,
        onEdit: access.canEdit ? openEditDrawer : undefined,
        onDelete: access.canDelete ? requestDeleteUnitOfMeasurement : undefined,
        unitGroupFilter: {
          options: unitGroupOptions,
          value: selectedUnitGroupId,
          onChange: handleUnitGroupFilterChange,
        },
      }),
    [
      selectedUnitGroupId,
      access.canView,
      access.canEdit,
      access.canDelete,
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
        scrollX={1660}
        enableColumnDrag
        pagination={pagination}
      />
    </div>
  );
}

export default function UnitOfMeasurementsPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <UnitOfMeasurementsTable />
      </Suspense>
    </div>
  );
}
