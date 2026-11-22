"use client";

import { deleteAssetCategory, fetchAssetCategories } from "@/features/fixed-assets/api/fixedAssets.api";
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
import { App, Button, Dropdown, Spin, Typography } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useMemo } from "react";

export const ASSET_CATEGORIES_QUERY_KEY = /** @type {const} */ (["tenant", "fixed-asset-categories"]);

function AssetCategoriesTable() {
  const t = useTranslations("AssetCategories");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification, message, modal } = App.useApp();
  const access = useResourceAccess("fixed_asset_categories");
  const queryClient = useQueryClient();
  const { openCreateDrawer, openEditDrawer, openViewDrawer } = usePageDrawer("assetCategories");

  const table = useTenantPaginatedTable({
    queryKey: ASSET_CATEGORIES_QUERY_KEY,
    queryFn: fetchAssetCategories,
    staleTime: QUERY_STALE_TIME.catalog,
    tableId: "asset-categories",
    t,
    tApiErrors,
    notification,
  });

  const remove = useMutation({
    mutationFn: (id) => deleteAssetCategory(id),
    onSuccess: () => {
      message.success(t("deleted"));
      invalidateTenantListQueries(queryClient, ASSET_CATEGORIES_QUERY_KEY);
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
      {
        title: t("code"),
        dataIndex: "code",
        key: "code",
        width: 120,
        render: (v) => <Typography.Text code className="text-xs">{v}</Typography.Text>,
      },
      { title: t("name"), dataIndex: "name", key: "name", width: 200, ellipsis: true },
      { title: t("method"), dataIndex: "method", key: "method", width: 150, render: (v) => t(v) },
      {
        title: t("life"),
        dataIndex: "useful_life_months",
        key: "life",
        width: 130,
        align: "right",
        render: (v) => t("lifeValue", { months: Number(v ?? 0), years: Math.round((Number(v ?? 0) / 12) * 10) / 10 }),
      },
      { title: t("salvage"), dataIndex: "salvage_percent", key: "salvage", width: 100, align: "right", render: (v) => `${Number(v ?? 0)}%` },
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
        tableId="asset-categories"
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
        scrollX={860}
        enableColumnDrag
        pagination={table.pagination}
      />
    </div>
  );
}

export default function AssetCategoriesPage() {
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
        <AssetCategoriesTable />
      </Suspense>
    </div>
  );
}
