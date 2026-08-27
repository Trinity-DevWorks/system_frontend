"use client";

import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { useMemo } from "react";
import { getUnitOfMeasurementDimensionTypeLabel, getUnitOfMeasurementStatusLabel } from "../components/UnitOfMeasurementTable/getUnitOfMeasurementTableColumns";
import { fetchUnitOfMeasurements } from "../api/unitOfMeasurements.api";
import { UNIT_OF_MEASUREMENTS_LIST_QUERY_KEY } from "./unitOfMeasurementsQueryKeys";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 * }} args
 */
export function useUnitOfMeasurementsTableQuery({ t, tApiErrors, notification }) {
  const table = useTenantPaginatedTable({
    queryKey: UNIT_OF_MEASUREMENTS_LIST_QUERY_KEY,
    queryFn: fetchUnitOfMeasurements,
    tableId: "unit-of-measurements",
    t,
    tApiErrors,
    notification,
  });

  const { rows } = table;

  const tableData = useMemo(
    () =>
      rows.map((row) => {
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
    [rows, t],
  );

  return {
    tableData,
    isPending: table.isPending,
    isFetching: table.isFetching,
    refetch: table.refetch,
    pagination: table.pagination,
    onSearchChange: table.onSearchChange,
  };
}
