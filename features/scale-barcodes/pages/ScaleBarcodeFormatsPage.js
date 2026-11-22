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
import { App, Button, Dropdown, Spin, Tag, Typography } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useMemo } from "react";
import { SCALE_BARCODE_FORMATS_QUERY_KEY, deleteScaleBarcodeFormat, fetchScaleBarcodeFormats } from "../api/scaleBarcodes.api";

function ScaleBarcodeFormatsTable() {
  const t = useTranslations("ScaleBarcodes");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification, message, modal } = App.useApp();
  const access = useResourceAccess("scale_barcode_formats");
  const queryClient = useQueryClient();
  const { openCreateDrawer, openEditDrawer, openViewDrawer } = usePageDrawer("scaleBarcodeFormats");

  const table = useTenantPaginatedTable({
    queryKey: SCALE_BARCODE_FORMATS_QUERY_KEY,
    queryFn: fetchScaleBarcodeFormats,
    staleTime: QUERY_STALE_TIME.catalog,
    tableId: "scale-barcode-formats",
    t,
    tApiErrors,
    notification,
  });

  const remove = useMutation({
    mutationFn: (id) => deleteScaleBarcodeFormat(id),
    onSuccess: () => {
      message.success(t("deleted"));
      invalidateTenantListQueries(queryClient, SCALE_BARCODE_FORMATS_QUERY_KEY);
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
      { title: t("symbology"), dataIndex: "symbology", key: "symbology", width: 150, render: (v) => t(`symbology_${v}`) },
      {
        title: t("prefixes"),
        dataIndex: "prefixes",
        key: "prefixes",
        width: 130,
        render: (v) =>
          Array.isArray(v) && v.length ? v.map((p) => <Typography.Text key={p} code className="text-xs">{p}</Typography.Text>) : "—",
      },
      { title: t("valueType"), dataIndex: "value_type", key: "value_type", width: 110, render: (v) => <Tag>{t(`type_${v}`)}</Tag> },
      {
        title: t("unitOrCurrency"),
        key: "unit",
        width: 140,
        render: (_, record) => record.value_type === "price" ? (record.currency?.code ?? t("primaryCurrency")) : (record.uom?.code ?? "—"),
      },
      {
        title: t("branches"),
        key: "branches",
        width: 200,
        ellipsis: true,
        render: (_, record) => (record.branches?.length ? record.branches.map((b) => b.name).join(", ") : t("allBranches")),
      },
      { title: t("priority"), dataIndex: "priority", key: "priority", width: 90, align: "right" },
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
                { key: "view", label: t("actionView"), icon: <EyeOutlined />, disabled: !access.canView, onClick: () => openViewDrawer(record) },
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
    [t, access.canView, access.canEdit, access.canDelete, openViewDrawer, openEditDrawer],
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="scale-barcode-formats"
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
        scrollX={1220}
        enableColumnDrag
        pagination={table.pagination}
      />
    </div>
  );
}

export default function ScaleBarcodeFormatsPage() {
  // The settings layout pads its pages; cancel it so this list lines up with the other list pages.
  return (
    <div className="-m-1 flex h-full min-h-0 min-w-0 flex-1 flex-col p-0 sm:-m-2">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <ScaleBarcodeFormatsTable />
      </Suspense>
    </div>
  );
}
