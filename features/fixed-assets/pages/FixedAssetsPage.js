"use client";

import { useReportBranch } from "@/features/accounting/useReportBranch";
import { stockFilterFieldRowClassName, useStockTableFilters } from "@/features/stock/components/StockTableFilters/StockTableFilters";
import { deleteFixedAsset, fetchAssetCategories, fetchFixedAssets } from "@/features/fixed-assets/api/fixedAssets.api";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useCompanySettings } from "@/lib/company-settings";
import { usePageDrawer } from "@/lib/drawer/usePageDrawer";
import { useResourceAccess } from "@/lib/permissions";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { invalidateTenantListQueries } from "@/lib/tables/tenantListCache";
import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { formatTenantDate, formatTenantMoneyWithSymbol } from "@/lib/tenant-format";
import AppDataTable from "@/shared/components/tables/AppDataTable";
import { DeleteOutlined, EditOutlined, EyeOutlined, MoreOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Dropdown, Form, Select, Spin, Typography } from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useMemo, useState } from "react";
import { useFixedAssetActions } from "../components/FixedAssetActions";
import FixedAssetStatusTag from "../components/FixedAssetStatusTag";

export const FIXED_ASSETS_QUERY_KEY = /** @type {const} */ (["tenant", "fixed-assets"]);
const STATUSES = ["draft", "active", "fully_depreciated", "disposed"];

function FixedAssetsTable() {
  const t = useTranslations("FixedAssets");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification, message, modal } = App.useApp();
  const access = useResourceAccess("fixed_assets");
  const { settings } = useCompanySettings();
  const queryClient = useQueryClient();
  const { openCreateDrawer, openEditDrawer, openViewDrawer } = usePageDrawer("fixedAssets");
  const assetActions = useFixedAssetActions();
  const [status, setStatus] = useState(/** @type {string | undefined} */ (undefined));
  const [categoryId, setCategoryId] = useState(/** @type {number | undefined} */ (undefined));
  const [branchId, setBranchId] = useState(/** @type {number | undefined} */ (undefined));

  const extraParams = useMemo(() => ({ status, category_id: categoryId, branch_id: branchId }), [status, categoryId, branchId]);
  const table = useTenantPaginatedTable({
    queryKey: FIXED_ASSETS_QUERY_KEY,
    queryFn: fetchFixedAssets,
    extraParams,
    staleTime: QUERY_STALE_TIME.default,
    tableId: "fixed-assets",
    t,
    tApiErrors,
    notification,
  });
  const categories = useQuery({
    queryKey: ["tenant", "fixed-asset-categories", "options"],
    queryFn: () => fetchAssetCategories({ per_page: 200 }),
    staleTime: QUERY_STALE_TIME.catalog,
  });
  // Only the branches this user may see; a single-branch user gets no branch filter.
  const { accessibleBranches } = useReportBranch(branchId);

  const remove = useMutation({
    mutationFn: (id) => deleteFixedAsset(id),
    onSuccess: () => {
      message.success(t("deleted"));
      invalidateTenantListQueries(queryClient, FIXED_ASSETS_QUERY_KEY);
    },
    onError: (error) => notification.error({ title: t("actionError"), description: getLocalizedApiErrorMessage(tApiErrors, error) }),
  });

  const money = (value) => formatTenantMoneyWithSymbol(value, settings.primaryCurrencySymbol ?? "");

  const columns = useMemo(
    () => [
      {
        title: t("number"),
        dataIndex: "asset_number",
        key: "asset_number",
        width: 170,
        render: (v) => (v ? <Typography.Text code className="text-xs">{v}</Typography.Text> : "—"),
      },
      { title: t("name"), dataIndex: "name", key: "name", width: 220, ellipsis: true },
      { title: t("category"), key: "category", width: 160, ellipsis: true, render: (_, r) => r.category?.name ?? "—" },
      { title: t("branch"), key: "branch", width: 140, ellipsis: true, render: (_, r) => r.branch?.name ?? "—" },
      { title: t("inService"), dataIndex: "in_service_date", key: "in_service_date", width: 120, render: (v) => formatTenantDate(v) || "—" },
      { title: t("cost"), dataIndex: "cost", key: "cost", width: 140, align: "right", render: money },
      { title: t("accumulated"), dataIndex: "accumulated_depreciation", key: "accumulated", width: 150, align: "right", render: money },
      { title: t("bookValue"), dataIndex: "book_value", key: "book_value", width: 140, align: "right", render: (v) => <strong>{money(v)}</strong> },
      { title: t("status"), dataIndex: "status", key: "status", width: 150, render: (v) => <FixedAssetStatusTag status={v} t={t} /> },
      {
        title: t("colActions"),
        key: "actions",
        fixed: "end",
        width: 72,
        align: "center",
        render: (_, record) => {
          const draft = record?.status === "draft";
          return (
            <Dropdown
              trigger={["click"]}
              menu={{
                items: [
                  { key: "view", label: t("actionView"), icon: <EyeOutlined />, onClick: () => openViewDrawer(record) },
                  { key: "edit", label: t("actionEdit"), icon: <EditOutlined />, disabled: !access.canEdit || record?.status === "disposed", onClick: () => openEditDrawer(record) },
                  { type: "divider" },
                  ...assetActions.menuItems(record),
                  { type: "divider" },
                  {
                    key: "delete",
                    label: t("actionDelete"),
                    icon: <DeleteOutlined />,
                    danger: true,
                    disabled: !access.canDelete || !draft,
                    onClick: () =>
                      modal.confirm({
                        title: t("deleteConfirmTitle"),
                        content: t("deleteConfirmContent", { name: record?.name ?? "" }),
                        okText: t("actionDelete"),
                        okButtonProps: { danger: true },
                        cancelText: t("cancel"),
                        onOk: () => remove.mutateAsync(String(record.id)),
                      }),
                  },
                ],
              }}
            >
              <Button type="text" size="small" icon={<MoreOutlined />} aria-label={t("colActions")} />
            </Dropdown>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, settings.primaryCurrencySymbol, access.canEdit, access.canDelete, openViewDrawer, openEditDrawer, assetActions.menuItems],
  );

  const categoryOptions = (categories.data?.rows ?? []).map((row) => ({ value: Number(row.id), label: row.name }));
  const branchOptions = accessibleBranches.map((row) => ({ value: Number(row.id), label: String(row.name ?? row.id) }));
  const showBranchFilter = branchOptions.length > 1;

  const filterSummary = useMemo(() => {
    const lines = [];
    if (status) lines.push({ label: t("status"), value: t(status) });
    if (categoryId != null) lines.push({ label: t("category"), value: categoryOptions.find((o) => o.value === categoryId)?.label ?? String(categoryId) });
    if (branchId != null) lines.push({ label: t("branch"), value: branchOptions.find((o) => o.value === branchId)?.label ?? String(branchId) });
    return lines;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, categoryId, branchId, categories.data, accessibleBranches, t]);

  const clearAllFilters = () => {
    setStatus(undefined);
    setCategoryId(undefined);
    setBranchId(undefined);
  };

  const { toggle: filterToggle, filterBar } = useStockTableFilters({
    activeCount: filterSummary.length,
    summary: filterSummary,
    onClearAll: clearAllFilters,
    children: (
      <div className="flex flex-col gap-1">
        <div className={stockFilterFieldRowClassName}>
          <Form.Item label={t("status")}>
            <Select
              allowClear
              className="w-full"
              placeholder={t("allStatuses")}
              value={status}
              onChange={setStatus}
              options={STATUSES.map((value) => ({ value, label: t(value) }))}
            />
          </Form.Item>
          <Form.Item label={t("category")}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              className="w-full"
              placeholder={t("allCategories")}
              value={categoryId}
              onChange={setCategoryId}
              options={categoryOptions}
            />
          </Form.Item>
        </div>
        {showBranchFilter ? (
          <div className={stockFilterFieldRowClassName}>
            <Form.Item label={t("branch")}>
              <Select allowClear className="w-full" placeholder={t("allBranches")} value={branchId} onChange={setBranchId} options={branchOptions} />
            </Form.Item>
          </div>
        ) : null}
      </div>
    ),
  });

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="fixed-assets"
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
          extra: filterToggle,
          filterBar,
        }}
        stickyHeader
        scrollX={1400}
        enableColumnDrag
        pagination={table.pagination}
      />
      {assetActions.dialogs}
    </div>
  );
}

export default function FixedAssetsPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <FixedAssetsTable />
      </Suspense>
    </div>
  );
}
