"use client";

import {
  stockFilterFieldRowClassName,
  useStockTableFilters,
} from "@/features/stock/components/StockTableFilters/StockTableFilters";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useCompanySettings } from "@/lib/company-settings";
import { usePageDrawer } from "@/lib/drawer/usePageDrawer";
import { useResourceAccess } from "@/lib/permissions";
import { invalidateTenantListQueries } from "@/lib/tables/tenantListCache";
import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { formatTenantMoneyWithSymbol } from "@/lib/tenant-format";
import AppDataTable from "@/shared/components/tables/AppDataTable";
import {
  CheckOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FileSyncOutlined,
  InboxOutlined,
  LineChartOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  DatePicker,
  Dropdown,
  Form,
  Select,
  Spin,
  Tag,
} from "antd";
import { useRouter } from "@/i18n/navigation";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { Suspense, useMemo, useState } from "react";
import {
  BUDGETS_QUERY_KEY,
  approveBudget,
  archiveBudget,
  deleteBudget,
  fetchBudgets,
  reviseBudget,
} from "../api/budgets.api";

const STATUSES = ["draft", "approved", "archived"];
const STATUS_COLOR = {
  draft: "default",
  approved: "green",
  archived: "default",
};

function BudgetsTable() {
  const t = useTranslations("Budgets");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification, message, modal } = App.useApp();
  const access = useResourceAccess("budgets");
  const { settings } = useCompanySettings();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { openCreateDrawer, openEditDrawer, openViewDrawer } =
    usePageDrawer("budgets");
  const [status, setStatus] = useState(
    /** @type {string | undefined} */ (undefined),
  );
  const [year, setYear] = useState(
    /** @type {number | undefined} */ (undefined),
  );
  const extraParams = useMemo(() => ({ status, year }), [status, year]);
  const table = useTenantPaginatedTable({
    queryKey: BUDGETS_QUERY_KEY,
    queryFn: fetchBudgets,
    extraParams,
    tableId: "budgets",
    t,
    tApiErrors,
    notification,
  });

  const action = useMutation({
    /** @param {{ name: string; run: () => Promise<any> }} job */
    mutationFn: (job) => job.run(),
    onSuccess: (_data, job) => {
      message.success(t(`${job.name}Success`));
      invalidateTenantListQueries(queryClient, BUDGETS_QUERY_KEY);
    },
    onError: (error) =>
      notification.error({
        title: t("actionError"),
        description: getLocalizedApiErrorMessage(tApiErrors, error),
      }),
  });
  const confirmRun = (name, run, danger = false) =>
    modal.confirm({
      title: t(`${name}Title`),
      content: t(`${name}Content`),
      okText: t(`action${name[0].toUpperCase()}${name.slice(1)}`),
      okButtonProps: danger ? { danger: true } : undefined,
      cancelText: t("cancel"),
      onOk: () => action.mutateAsync({ name, run }).catch(() => {}),
    });
  const money = (value) =>
    formatTenantMoneyWithSymbol(
      value ?? 0,
      settings.primaryCurrencySymbol ?? "",
    );

  const columns = useMemo(
    () => [
      {
        title: t("fieldName"),
        dataIndex: "name",
        ellipsis: true,
        render: (value, row) =>
          row.version > 1 ? `${value} · v${row.version}` : value,
      },
      { title: t("fieldYear"), dataIndex: "year", width: 90 },
      {
        title: t("fieldScope"),
        dataIndex: "branch_name",
        width: 160,
        render: (value) => value || t("wholeCompany"),
      },
      {
        title: t("status"),
        dataIndex: "status",
        width: 120,
        render: (value) => (
          <Tag color={STATUS_COLOR[value] ?? "default"}>
            {t(`status_${value}`)}
          </Tag>
        ),
      },
      {
        title: t("totalRevenue"),
        dataIndex: "revenue_total",
        width: 150,
        align: "right",
        render: money,
      },
      {
        title: t("totalExpense"),
        dataIndex: "expense_total",
        width: 150,
        align: "right",
        render: money,
      },
      {
        title: t("colActions"),
        key: "actions",
        fixed: "end",
        width: 72,
        align: "center",
        render: (_, row) => {
          const id = String(row.id);
          const draft = row.status === "draft";
          return (
            <Dropdown
              trigger={["click"]}
              menu={{
                items: [
                  {
                    key: "view",
                    icon: <EyeOutlined />,
                    label: t("actionView"),
                    onClick: () => openViewDrawer(row),
                  },
                  access.canEdit && draft
                    ? {
                        key: "edit",
                        icon: <EditOutlined />,
                        label: t("actionEdit"),
                        onClick: () => openEditDrawer(row),
                      }
                    : null,
                  {
                    key: "report",
                    icon: <LineChartOutlined />,
                    label: t("openReport"),
                    onClick: () =>
                      router.push(
                        `/main/accounting/budget-vs-actual?budget_id=${encodeURIComponent(id)}`,
                      ),
                  },
                  access.canEdit && draft
                    ? {
                        key: "approve",
                        icon: <CheckOutlined />,
                        label: t("actionApprove"),
                        onClick: () =>
                          confirmRun("approve", () => approveBudget(id)),
                      }
                    : null,
                  access.canEdit && row.status === "approved"
                    ? {
                        key: "revise",
                        icon: <FileSyncOutlined />,
                        label: t("actionRevise"),
                        onClick: () =>
                          confirmRun("revise", () => reviseBudget(id)),
                      }
                    : null,
                  access.canEdit && row.status !== "archived"
                    ? { type: "divider" }
                    : null,
                  access.canEdit && row.status !== "archived"
                    ? {
                        key: "archive",
                        icon: <InboxOutlined />,
                        danger: true,
                        label: t("actionArchive"),
                        onClick: () =>
                          confirmRun("archive", () => archiveBudget(id), true),
                      }
                    : null,
                  access.canDelete && draft
                    ? {
                        key: "delete",
                        icon: <DeleteOutlined />,
                        danger: true,
                        label: t("actionDelete"),
                        onClick: () =>
                          confirmRun("delete", () => deleteBudget(id), true),
                      }
                    : null,
                ].filter(Boolean),
              }}
            >
              <Button
                type="text"
                size="small"
                icon={<MoreOutlined />}
                aria-label={t("colActions")}
              />
            </Dropdown>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      t,
      access.canEdit,
      access.canDelete,
      settings.primaryCurrencySymbol,
      openViewDrawer,
      openEditDrawer,
    ],
  );

  const summary = [
    ...(status ? [{ label: t("status"), value: t(`status_${status}`) }] : []),
    ...(year ? [{ label: t("fieldYear"), value: String(year) }] : []),
  ];
  const { toggle: filterToggle, filterBar } = useStockTableFilters({
    activeCount: summary.length,
    summary,
    onClearAll: () => {
      setStatus(undefined);
      setYear(undefined);
    },
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
        <Form.Item label={t("fieldYear")}>
          <DatePicker
            picker="year"
            className="w-full"
            value={year ? dayjs(`${year}-01-01`) : null}
            onChange={(value) => setYear(value ? value.year() : undefined)}
          />
        </Form.Item>
      </div>
    ),
  });

  return (
    <AppDataTable
      tableId="budgets"
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
      scrollX={1000}
      pagination={table.pagination}
    />
  );
}

export default function BudgetsPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <BudgetsTable />
      </Suspense>
    </div>
  );
}
