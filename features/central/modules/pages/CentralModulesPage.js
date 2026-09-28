"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import AppDataTable from "@/shared/components/tables/AppDataTable";
import { useQuery } from "@tanstack/react-query";
import { App } from "antd";
import { useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { fetchCentralModules } from "../api/modules.api";
import { getModuleTableColumns } from "../components/getModuleTableColumns";
import { CENTRAL_MODULES_QUERY_KEY } from "../queries/modulesQueryKeys";

export default function CentralModulesPage() {
  const t = useTranslations("CentralModules");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification } = App.useApp();

  const { data, isPending, isFetching, isError, error, refetch } = useQuery({
    queryKey: CENTRAL_MODULES_QUERY_KEY,
    queryFn: fetchCentralModules,
    staleTime: QUERY_STALE_TIME.lookup,
  });

  useEffect(() => {
    if (!isError || !error) return;
    notification.error({
      title: t("loadError"),
      description: getLocalizedApiErrorMessage(tApiErrors, error),
    });
  }, [isError, error, notification, t, tApiErrors]);

  const columns = useMemo(() => getModuleTableColumns(t), [t]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <AppDataTable
        tableId="central-modules"
        columns={columns}
        dataSource={Array.isArray(data) ? data : []}
        rowKey="code"
        loading={isPending}
        refreshFetching={isFetching}
        onRetry={() => refetch()}
        emptyText={t("empty")}
        toolbar={{
          showSearch: true,
          searchKeys: ["code", "name", "description"],
          showAdd: false,
          showRefresh: true,
          onRefresh: () => refetch(),
          showExportExcel: false,
          showExportPdf: false,
          showImportExcel: false,
        }}
        stickyHeader
        scrollX={1000}
      />
    </div>
  );
}
