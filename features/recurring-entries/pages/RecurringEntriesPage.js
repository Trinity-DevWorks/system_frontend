"use client";

import { stockFilterFieldRowClassName, useStockTableFilters } from "@/features/stock/components/StockTableFilters/StockTableFilters";
import AppDataTable from "@/shared/components/tables/AppDataTable";
import { useGlobalDrawer } from "@/lib/drawer/GlobalDrawerContext";
import { usePageDrawer } from "@/lib/drawer/usePageDrawer";
import { useResourceAccess } from "@/lib/permissions";
import { App, Form, Segmented, Select, Spin } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useMemo, useState } from "react";
import { getRecurringRunTableColumns } from "../components/RecurringRunTable/getRecurringRunTableColumns";
import { getRecurringTemplateTableColumns } from "../components/RecurringTemplateTable/getRecurringTemplateTableColumns";
import { useRecurringRunsTableQuery } from "../queries/useRecurringRunsTableQuery";
import { useRecurringTemplateActions } from "../queries/useRecurringTemplateActions";
import { useRecurringTemplatesDelete } from "../queries/useRecurringTemplatesDelete";
import { useRecurringTemplatesTableQuery } from "../queries/useRecurringTemplatesTableQuery";

function RecurringEntriesContent() {
  const t = useTranslations("RecurringEntries");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification, modal, message } = App.useApp();
  const access = useResourceAccess("recurring_entries");
  const { openDrawer } = useGlobalDrawer();
  const { openCreateDrawer, openEditDrawer, openViewDrawer } =
    usePageDrawer("recurringEntries");
  const [tab, setTab] = useState("templates");
  const [status, setStatus] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [runStatus, setRunStatus] = useState("");

  const templates = useRecurringTemplatesTableQuery({
    t,
    tApiErrors,
    notification,
    extraParams: {
      ...(status ? { status } : {}),
      ...(documentType ? { document_type: documentType } : {}),
    },
  });
  const runs = useRecurringRunsTableQuery({
    t,
    tApiErrors,
    notification,
    extraParams: runStatus ? { status: runStatus } : {},
  });
  const actions = useRecurringTemplateActions({
    t,
    tApiErrors,
    message,
    notification,
  });
  const { requestDelete } = useRecurringTemplatesDelete({
    t,
    tApiErrors,
    message,
    notification,
    modal,
  });

  const confirm = (record, action) =>
    modal.confirm({
      title: t(`${action}ConfirmTitle`),
      content: t(`${action}ConfirmContent`, {
        name: record.name ?? record.template?.name ?? "",
      }),
      okText:
        action === "cancel"
          ? t("actionCancelTemplate")
          : t(`action${action[0].toUpperCase()}${action.slice(1)}`),
      okButtonProps: action === "cancel" ? { danger: true } : undefined,
      cancelText: t("drawerCancel"),
      onOk: () =>
        actions
          .mutateAsync({ id: record.id, action })
          .then((result) => {
            if (action !== "run" && action !== "retry") return;
            if (!result || typeof result !== "object") return;
            const failed = Number(result.failed ?? 0);
            const text = t("runResult", {
              generated: Number(result.generated ?? 0),
              failed,
            });
            if (failed === 0) {
              message.info(text);
              return;
            }
            // Say why it failed, not just how many.
            const code = result.error_code ? String(result.error_code) : "";
            const reason =
              code && tApiErrors.has(`codes.${code}`)
                ? tApiErrors(`codes.${code}`)
                : t("runFailedUnknown");
            notification.warning({ title: text, description: reason });
          })
          .catch(() => {}),
    });

  const templateColumns = useMemo(
    () =>
      getRecurringTemplateTableColumns(t, {
        onView: access.canView ? openViewDrawer : undefined,
        onEdit: access.canEdit ? openEditDrawer : undefined,
        onDelete: access.canDelete ? requestDelete : undefined,
        onRun: access.canEdit ? (record) => confirm(record, "run") : undefined,
        onPause: access.canEdit
          ? (record) => confirm(record, "pause")
          : undefined,
        onResume: access.canEdit
          ? (record) => confirm(record, "resume")
          : undefined,
        onSkip: access.canEdit
          ? (record) => confirm(record, "skip")
          : undefined,
        onCancel: access.canEdit
          ? (record) => confirm(record, "cancel")
          : undefined,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, access.canView, access.canEdit, access.canDelete],
  );
  const runColumns = useMemo(
    () =>
      getRecurringRunTableColumns(t, tApiErrors, {
        onOpenDocument: (record) => {
          const featureId =
            record.document_type === "expense_voucher"
              ? "expenseVouchers"
              : "journalEntries";
          if (record.document_id)
            openDrawer({
              featureId,
              id: String(record.document_id),
              mode: "view",
            });
        },
        onRetry: access.canEdit
          ? (record) => confirm(record, "retry")
          : undefined,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, tApiErrors, access.canEdit],
  );

  const templateStatuses = ["active", "paused", "completed", "cancelled"];
  const templateTypes = ["journal_entry", "expense_voucher"];
  const runStatuses = ["generated", "posted", "failed", "skipped"];

  // Each tab keeps its own filters; the popover shows the ones for the open tab.
  const filterSummary =
    tab === "templates"
      ? [
          ...(status ? [{ label: t("filterStatus"), value: t(`status_${status}`) }] : []),
          ...(documentType ? [{ label: t("filterType"), value: t(`type_${documentType}`) }] : []),
        ]
      : runStatus
        ? [{ label: t("filterStatus"), value: t(`run_${runStatus}`) }]
        : [];

  const clearAllFilters = () => {
    if (tab === "templates") {
      setStatus("");
      setDocumentType("");
    } else {
      setRunStatus("");
    }
  };

  const { toggle: filterToggle, filterBar } = useStockTableFilters({
    activeCount: filterSummary.length,
    summary: filterSummary,
    onClearAll: clearAllFilters,
    children:
      tab === "templates" ? (
        <div className={stockFilterFieldRowClassName}>
          <Form.Item label={t("filterStatus")}>
            <Select
              allowClear
              className="w-full"
              placeholder={t("allStatuses")}
              value={status || undefined}
              onChange={(value) => setStatus(value ?? "")}
              options={templateStatuses.map((value) => ({ value, label: t(`status_${value}`) }))}
            />
          </Form.Item>
          <Form.Item label={t("filterType")}>
            <Select
              allowClear
              className="w-full"
              placeholder={t("allTypes")}
              value={documentType || undefined}
              onChange={(value) => setDocumentType(value ?? "")}
              options={templateTypes.map((value) => ({ value, label: t(`type_${value}`) }))}
            />
          </Form.Item>
        </div>
      ) : (
        <div className={stockFilterFieldRowClassName}>
          <Form.Item label={t("filterStatus")}>
            <Select
              allowClear
              className="w-full"
              placeholder={t("allStatuses")}
              value={runStatus || undefined}
              onChange={(value) => setRunStatus(value ?? "")}
              options={runStatuses.map((value) => ({ value, label: t(`run_${value}`) }))}
            />
          </Form.Item>
        </div>
      ),
  });

  const table = tab === "templates" ? templates : runs;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId={tab === "templates" ? "recurring-templates" : "recurring-runs"}
        columns={tab === "templates" ? templateColumns : runColumns}
        dataSource={table.rows}
        rowKey="id"
        loading={table.isPending}
        refreshFetching={table.isFetching}
        onRetry={() => table.refetch()}
        emptyText={tab === "templates" ? t("empty") : t("runsEmpty")}
        toolbar={{
          showSearch: true,
          enableClientSearch: false,
          onSearchChange: table.onSearchChange,
          showAdd: tab === "templates" && access.canAdd,
          onAdd: openCreateDrawer,
          addLabel: t("add"),
          extra: (
            <>
              <Segmented
                value={tab}
                onChange={(value) => setTab(String(value))}
                options={[
                  { value: "templates", label: t("tabTemplates") },
                  { value: "runs", label: t("tabRuns") },
                ]}
              />
              {filterToggle}
            </>
          ),
          filterBar,
          showRefresh: true,
          onRefresh: () => table.refetch(),
        }}
        stickyHeader
        scrollX={1200}
        pagination={table.pagination}
      />
    </div>
  );
}

export default function RecurringEntriesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <Spin />
        </div>
      }
    >
      <RecurringEntriesContent />
    </Suspense>
  );
}
