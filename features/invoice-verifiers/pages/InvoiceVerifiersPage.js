"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useCompanySettings } from "@/lib/company-settings";
import { usePageDrawer } from "@/lib/drawer/usePageDrawer";
import { useResourceAccess } from "@/lib/permissions";
import AppDataTable from "@/shared/components/tables/AppDataTable";
import { Alert, App, Spin } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useMemo } from "react";
import { getInvoiceVerifierTableColumns } from "../components/InvoiceVerifierTable/getInvoiceVerifierTableColumns";
import { useInvoiceVerifierRowActions } from "../queries/useInvoiceVerifierRowActions";
import { useInvoiceVerifiersQuery } from "../queries/useInvoiceVerifiersQuery";

const SEARCH_KEYS = ["name", "wallet_address", "email", "phone"];

function InvoiceVerifiersTable() {
  const t = useTranslations("InvoiceVerifiers");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal } = App.useApp();
  // invoice_proofs has only view and edit; the backend requires edit for every write.
  const access = useResourceAccess("invoice_proofs");

  const { rows, isPending, isFetching, error, refetch } = useInvoiceVerifiersQuery();
  const { openCreateDrawer, openEditDrawer, openViewDrawer, closeDrawer, getOpenRecordId } =
    usePageDrawer("invoiceVerifiers");

  const { requestResync, requestRemove } = useInvoiceVerifierRowActions({
    t,
    tApiErrors,
    message,
    modal,
    getOpenRecordId,
    closeDrawer,
  });

  const columns = useMemo(
    () =>
      getInvoiceVerifierTableColumns(t, {
        onView: access.canView ? openViewDrawer : undefined,
        onEdit: access.canEdit ? openEditDrawer : undefined,
        onResync: access.canEdit ? requestResync : undefined,
        onRemove: access.canEdit ? requestRemove : undefined,
      }),
    [t, access.canView, access.canEdit, openViewDrawer, openEditDrawer, requestResync, requestRemove],
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      <Alert type="info" showIcon title={t("hint")} />
      {error ? (
        <Alert type="error" showIcon title={getLocalizedApiErrorMessage(tApiErrors, error) || t("loadError")} />
      ) : null}
      <AppDataTable
        tableId="invoiceVerifiers"
        columns={columns}
        dataSource={rows}
        rowKey="id"
        loading={isPending}
        refreshFetching={isFetching}
        onRetry={() => refetch()}
        emptyText={t("empty")}
        toolbar={{
          showSearch: true,
          searchKeys: SEARCH_KEYS,
          showAdd: access.canEdit,
          onAdd: openCreateDrawer,
          addLabel: t("add"),
          showRefresh: true,
          onRefresh: () => refetch(),
          showExportExcel: false,
          showExportPdf: false,
          showImportExcel: false,
        }}
        rowSelection={false}
        showSelectionBar={false}
        stickyHeader
        scrollX={1300}
        enableColumnDrag
      />
    </div>
  );
}

export default function InvoiceVerifiersPage() {
  const t = useTranslations("InvoiceVerifiers");
  const { settings, isReady } = useCompanySettings();

  const spinner = (
    <div className="flex min-h-40 items-center justify-center">
      <Spin />
    </div>
  );

  if (!isReady) return spinner;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      {settings.invoiceProofsEnabled ? (
        <Suspense fallback={spinner}>
          <InvoiceVerifiersTable />
        </Suspense>
      ) : (
        <Alert type="info" showIcon title={t("disabled")} />
      )}
    </div>
  );
}
