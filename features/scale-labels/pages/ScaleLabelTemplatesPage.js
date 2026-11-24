"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { usePageDrawer } from "@/lib/drawer/usePageDrawer";
import { useResourceAccess } from "@/lib/permissions";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { invalidateTenantListQueries } from "@/lib/tables/tenantListCache";
import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import ActiveStatusBadge from "@/shared/components/tables/ActiveStatusBadge";
import AppDataTable from "@/shared/components/tables/AppDataTable";
import { DeleteOutlined, EditOutlined, EyeOutlined, MoreOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Button, Dropdown, Spin, Tag } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useMemo } from "react";
import { SCALE_LABEL_TEMPLATES_QUERY_KEY, deleteScaleLabelTemplate, fetchScaleLabelTemplates } from "../api/scaleLabels.api";

function ScaleLabelTemplatesTable() {
  const t = useTranslations("ScaleLabels");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification, message, modal } = App.useApp();
  const access = useResourceAccess("scale_barcode_formats");
  const queryClient = useQueryClient();
  const { openCreateDrawer, openEditDrawer, openViewDrawer } = usePageDrawer("scaleLabelTemplates");

  const table = useTenantPaginatedTable({
    queryKey: SCALE_LABEL_TEMPLATES_QUERY_KEY,
    queryFn: fetchScaleLabelTemplates,
    staleTime: QUERY_STALE_TIME.catalog,
    tableId: "scale-label-templates",
    t,
    tApiErrors,
    notification,
  });

  const remove = useMutation({
    mutationFn: (id) => deleteScaleLabelTemplate(id),
    onSuccess: () => {
      message.success(t("deleted"));
      invalidateTenantListQueries(queryClient, SCALE_LABEL_TEMPLATES_QUERY_KEY);
    },
    onError: (error) => notification.error({ title: t("deleteError"), description: getLocalizedApiErrorMessage(tApiErrors, error) }),
  });

  const confirmDelete = (record) =>
    modal.confirm({
      title: t("deleteConfirm"),
      content: t("deleteConfirmContent", { name: record?.name ?? "" }),
      okText: t("actionDelete"),
      okButtonProps: { danger: true },
      cancelText: t("cancel"),
      onOk: () => remove.mutateAsync(record.id),
    });

  const columns = useMemo(
    () => [
      { title: t("name"), dataIndex: "name", key: "name", width: 220, ellipsis: true },
      { title: t("mode"), dataIndex: "mode", key: "mode", width: 130, render: (v) => <Tag>{t(`mode_${v}`)}</Tag> },
      { title: t("size"), key: "size", width: 150, render: (_, r) => t("sizeMm", { width: Number(r.width_mm), height: Number(r.height_mm) }) + (r.mode === "sheet" ? ` · ${r.sheet_columns}×${r.sheet_rows}` : "") },
      { title: t("barcodeFormat"), key: "format", width: 200, ellipsis: true, render: (_, r) => r.barcode_format?.name ?? t("noBarcode") },
      { title: t("fieldsCount"), key: "fields", width: 100, align: "right", render: (_, r) => (r.fields ?? []).length },
      {
        title: t("status"),
        dataIndex: "is_active",
        key: "is_active",
        width: 110,
        render: (v) => <ActiveStatusBadge active={Boolean(v)} label={v ? t("statusActive") : t("statusInactive")} />,
      },
      {
        title: t("colActions"),
        key: "actions",
        fixed: "end",
        width: 72,
        align: "center",
        render: (_, record) => (
          <Dropdown
            trigger={["click"]}
            menu={{
              items: [
                { key: "view", label: t("actionView"), icon: <EyeOutlined />, onClick: () => openViewDrawer(record) },
                { key: "edit", label: t("actionEdit"), icon: <EditOutlined />, disabled: !access.canEdit, onClick: () => openEditDrawer(record) },
                { type: "divider" },
                { key: "delete", label: t("actionDelete"), icon: <DeleteOutlined />, danger: true, disabled: !access.canDelete, onClick: () => confirmDelete(record) },
              ],
            }}
          >
            <Button type="text" size="small" icon={<MoreOutlined />} aria-label={t("colActions")} />
          </Dropdown>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, access.canEdit, access.canDelete, openViewDrawer, openEditDrawer],
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="scale-label-templates"
        columns={columns}
        dataSource={table.rows}
        rowKey="id"
        loading={table.isPending}
        refreshFetching={table.isFetching}
        onRetry={() => table.refetch()}
        emptyText={t("empty")}
        toolbar={{
          showSearch: true,
          enableClientSearch: false,
          onSearchChange: table.onSearchChange,
          showAdd: access.canAdd,
          onAdd: openCreateDrawer,
          addLabel: t("add"),
          showRefresh: true,
          onRefresh: () => table.refetch(),
        }}
        stickyHeader
        scrollX={1050}
        enableColumnDrag
        pagination={table.pagination}
      />
    </div>
  );
}

export default function ScaleLabelTemplatesPage() {
  return (
    <div className="-m-1 flex h-full min-h-0 min-w-0 flex-1 flex-col p-0 sm:-m-2">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <ScaleLabelTemplatesTable />
      </Suspense>
    </div>
  );
}
