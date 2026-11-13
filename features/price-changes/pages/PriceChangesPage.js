"use client";

import {
  PRICE_CHANGES_QUERY_KEY,
  cancelPriceChange,
  deletePriceChange,
  fetchPriceChanges,
} from "@/features/price-changes/api/priceChanges.api";
import {
  stockFilterFieldRowClassName,
  useStockTableFilters,
} from "@/features/stock/components/StockTableFilters/StockTableFilters";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { usePageDrawer } from "@/lib/drawer/usePageDrawer";
import { useResourceAccess } from "@/lib/permissions";
import { invalidateTenantListQueries } from "@/lib/tables/tenantListCache";
import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { formatTenantDate } from "@/lib/tenant-format";
import AppDataTable from "@/shared/components/tables/AppDataTable";
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  MoreOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Dropdown,
  Form,
  Select,
  Spin,
  Tag,
  Typography,
} from "antd";
import { useTranslations } from "next-intl";
import { Suspense, useMemo, useState } from "react";

const STATUSES = ["draft", "scheduled", "applied", "cancelled"];
const STATUS_COLOR = {
  draft: "default",
  scheduled: "gold",
  applied: "green",
  cancelled: "default",
};

function PriceChangesTable() {
  const t = useTranslations("PriceChanges");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification, message, modal } = App.useApp();
  const access = useResourceAccess("price_changes");
  const queryClient = useQueryClient();
  const { openCreateDrawer, openEditDrawer, openViewDrawer } =
    usePageDrawer("priceChanges");
  const [status, setStatus] = useState(
    /** @type {string | undefined} */ (undefined),
  );
  const extraParams = useMemo(() => ({ status }), [status]);
  const table = useTenantPaginatedTable({
    queryKey: PRICE_CHANGES_QUERY_KEY,
    queryFn: fetchPriceChanges,
    extraParams,
    tableId: "price-changes",
    t,
    tApiErrors,
    notification,
  });
  const onError = (error) =>
    notification.error({
      title: t("actionError"),
      description: getLocalizedApiErrorMessage(tApiErrors, error),
    });
  const remove = useMutation({
    mutationFn: (id) => deletePriceChange(String(id)),
    onSuccess: () => {
      message.success(t("deleted"));
      invalidateTenantListQueries(queryClient, PRICE_CHANGES_QUERY_KEY);
    },
    onError,
  });
  const cancel = useMutation({
    mutationFn: (id) => cancelPriceChange(String(id)),
    onSuccess: () => {
      message.success(t("cancelled"));
      invalidateTenantListQueries(queryClient, PRICE_CHANGES_QUERY_KEY);
    },
    onError,
  });

  const columns = useMemo(
    () => [
      {
        title: t("number"),
        dataIndex: "number",
        width: 180,
        render: (value) =>
          value ? (
            <Typography.Text code className="text-xs">
              {value}
            </Typography.Text>
          ) : (
            "—"
          ),
      },
      {
        title: t("effectiveDate"),
        dataIndex: "effective_date",
        width: 140,
        render: (value) => formatTenantDate(value) || "—",
      },
      {
        title: t("status"),
        dataIndex: "status",
        width: 130,
        render: (value) => (
          <Tag color={STATUS_COLOR[value] ?? "default"}>
            {t(`status_${value}`)}
          </Tag>
        ),
      },
      {
        title: t("lines"),
        dataIndex: "lines_count",
        width: 90,
        align: "right",
      },
      {
        title: t("reason"),
        dataIndex: "notes",
        ellipsis: true,
        render: (value) => value || "—",
      },
      {
        title: t("actions"),
        key: "actions",
        fixed: "end",
        width: 72,
        align: "center",
        render: (_, row) => {
          const open = row.status === "draft" || row.status === "scheduled";
          return (
            <Dropdown
              trigger={["click"]}
              menu={{
                items: [
                  {
                    key: "view",
                    icon: <EyeOutlined />,
                    label: t("view"),
                    onClick: () => openViewDrawer(row),
                  },
                  access.canEdit && row.status === "draft"
                    ? {
                        key: "edit",
                        icon: <EditOutlined />,
                        label: t("edit"),
                        onClick: () => openEditDrawer(row),
                      }
                    : null,
                  access.canEdit && open ? { type: "divider" } : null,
                  access.canEdit && open
                    ? {
                        key: "cancel",
                        icon: <StopOutlined />,
                        danger: true,
                        label: t("cancelDoc"),
                        onClick: () =>
                          modal.confirm({
                            title: t("cancelConfirmTitle"),
                            content: t("cancelConfirmContent"),
                            okText: t("cancelDoc"),
                            okButtonProps: { danger: true },
                            cancelText: t("cancel"),
                            onOk: () =>
                              cancel.mutateAsync(row.id).catch(() => {}),
                          }),
                      }
                    : null,
                  access.canDelete && row.status === "draft"
                    ? {
                        key: "delete",
                        icon: <DeleteOutlined />,
                        danger: true,
                        label: t("delete"),
                        onClick: () =>
                          modal.confirm({
                            title: t("deleteConfirm"),
                            okText: t("delete"),
                            okButtonProps: { danger: true },
                            cancelText: t("cancel"),
                            onOk: () =>
                              remove.mutateAsync(row.id).catch(() => {}),
                          }),
                      }
                    : null,
                ].filter(Boolean),
              }}
            >
              <Button
                type="text"
                size="small"
                icon={<MoreOutlined />}
                aria-label={t("actions")}
              />
            </Dropdown>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [access.canDelete, access.canEdit, openEditDrawer, openViewDrawer, t],
  );

  const { toggle: filterToggle, filterBar } = useStockTableFilters({
    activeCount: status ? 1 : 0,
    summary: status
      ? [{ label: t("status"), value: t(`status_${status}`) }]
      : [],
    onClearAll: () => setStatus(undefined),
    children: (
      <div className={stockFilterFieldRowClassName}>
        <Form.Item label={t("status")}>
          <Select
            allowClear
            className="w-full"
            placeholder={t("allStatuses")}
            value={status}
            onChange={setStatus}
            options={STATUSES.map((value) => ({
              value,
              label: t(`status_${value}`),
            }))}
          />
        </Form.Item>
      </div>
    ),
  });

  return (
    <AppDataTable
      tableId="price-changes"
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
        extra: filterToggle,
        filterBar,
        showRefresh: true,
        onRefresh: () => table.refetch(),
      }}
      stickyHeader
      scrollX={900}
      pagination={table.pagination}
    />
  );
}

export default function PriceChangesPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <PriceChangesTable />
      </Suspense>
    </div>
  );
}
