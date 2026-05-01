"use client";

import tenantApiService from "@/API/TenantApiService";
import AppDataTable from "@/components/tables/AppDataTable";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import {
  getUnitOfMeasurementDimensionTypeLabel,
  getUnitOfMeasurementStatusLabel,
  getUnitOfMeasurementTableColumns,
} from "./getUnitOfMeasurementTableColumns";
import { useQuery } from "@tanstack/react-query";
import { App } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

async function fetchUnitOfMeasurements() {
  const data = await tenantApiService("GET", "unit-of-measurements");
  return Array.isArray(data) ? data : [];
}

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
  const { message, notification } = App.useApp();
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
      message: t("loadError"),
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

  const columns = useMemo(
    () =>
      getUnitOfMeasurementTableColumns(t, {
        unitGroupFilter: {
          options: unitGroupOptions,
          value: activeUnitGroupId,
          onChange: handleUnitGroupFilterChange,
        },
      }),
    [activeUnitGroupId, handleUnitGroupFilterChange, t, unitGroupOptions],
  );

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    columnWidth: 48,
  };

  return (
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
        onAdd: () => message.info(t("addSoon")),
        showRefresh: true,
        onRefresh: () => refetch(),
      }}
      rowSelection={rowSelection}
      showSelectionBar
      stickyHeader
      scrollX={1660}
      enableColumnDrag
      pagination={{
        mode: "client",
        pageSize: 20,
        pageSizeOptions: [10, 20, 50],
      }}
    />
  );
}

export default function UnitOfMeasurementsPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-col p-2">
      <UnitOfMeasurementsTable />
    </div>
  );
}
