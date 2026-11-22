"use client";

import { useReportBranch } from "@/features/accounting/useReportBranch";
import { previewDepreciation, fetchDepreciationRuns, postDepreciation, undoDepreciation } from "@/features/fixed-assets/api/fixedAssets.api";
import { updateCompanySettings } from "@/lib/api/companySettings";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { bumpCompanySettingsSync, useCompanySettings } from "@/lib/company-settings";
import { useGlobalDrawer } from "@/lib/drawer/GlobalDrawerContext";
import { useResourceAccess } from "@/lib/permissions";
import { formatTenantMoneyWithSymbol } from "@/lib/tenant-format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Card, DatePicker, Select, Spin, Switch, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { Suspense, useState, useSyncExternalStore } from "react";

const RUNS_KEY = ["tenant", "depreciation-runs"];

/** False while rendering on the server, true in the browser (avoids hydration mismatches). */
const subscribeNoop = () => () => {};
const monthLabel = (value) => (value ? dayjs(String(value)).format("MM/YYYY") : "—");

function DepreciationRunView() {
  const t = useTranslations("DepreciationRun");
  const tApiErrors = useTranslations("ApiErrors");
  const { settings } = useCompanySettings();
  const access = useResourceAccess("depreciation_runs");
  const settingsAccess = useResourceAccess("company_settings");
  const { notification, message, modal } = App.useApp();
  const { openStackedDrawer } = useGlobalDrawer();
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(dayjs().subtract(1, "month").startOf("month"));
  const inBrowser = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const [branchId, setBranchId] = useState(/** @type {number | undefined} */ (undefined));
  // Only the branches this user may see; a single accessible branch is selected and locked.
  const { accessibleBranches, lockedBranchId, selectedBranchId, isPending: branchesPending } = useReportBranch(branchId);
  const monthKey = month.format("YYYY-MM-01");
  const money = (value) => formatTenantMoneyWithSymbol(value ?? 0, settings.primaryCurrencySymbol ?? "");

  const history = useQuery({ queryKey: RUNS_KEY, queryFn: fetchDepreciationRuns, enabled: access.canView });
  const preview = useQuery({
    queryKey: [...RUNS_KEY, "preview", monthKey, selectedBranchId ?? null],
    queryFn: () => previewDepreciation(monthKey, selectedBranchId ?? null),
    enabled: access.canView,
    retry: false,
  });

  const rows = Array.isArray(preview.data?.rows) ? preview.data.rows : [];
  const totals = Array.isArray(preview.data?.totals) ? preview.data.totals : [];
  const runs = Array.isArray(history.data) ? history.data : [];
  // Runs are per branch: "already posted" applies to the branch being looked at.
  const alreadyPosted =
    selectedBranchId != null &&
    runs.some((run) => String(run.month).slice(0, 7) === month.format("YYYY-MM") && run.status !== "undone" && Number(run.branch_id) === Number(selectedBranchId));
  const multipleBranches = accessibleBranches.length > 1;
  const selectedBranchName = accessibleBranches.find((row) => Number(row.id) === Number(selectedBranchId))?.name ?? "";

  const onError = (titleKey) => (error) => notification.error({ title: t(titleKey), description: getLocalizedApiErrorMessage(tApiErrors, error) });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: RUNS_KEY });
    queryClient.invalidateQueries({ queryKey: ["tenant", "fixed-assets"] });
  };
  const post = useMutation({
    mutationFn: () => postDepreciation(monthKey, selectedBranchId ?? null),
    onSuccess: () => {
      message.success(t("postSuccess"));
      refresh();
    },
    onError: onError("postError"),
  });
  const undo = useMutation({
    mutationFn: (run) => undoDepreciation(String(run.month).slice(0, 10), Number(run.branch_id)),
    onSuccess: () => {
      message.success(t("undoSuccess"));
      refresh();
    },
    onError: onError("undoError"),
  });
  const auto = useMutation({
    mutationFn: (checked) => updateCompanySettings({ auto_depreciation: checked }),
    onSuccess: async () => {
      message.success(t("autoSaved"));
      bumpCompanySettingsSync();
      await queryClient.invalidateQueries({ queryKey: ["tenant", "company-settings"] });
    },
    onError: onError("postError"),
  });

  const confirmPost = () =>
    modal.confirm({
      title: t("postTitle"),
      content:
        selectedBranchId != null && multipleBranches
          ? t("postConfirmBranch", { month: monthLabel(monthKey), total: money(preview.data?.total), branch: selectedBranchName })
          : multipleBranches
            ? t("postConfirmYourBranches", { month: monthLabel(monthKey), total: money(preview.data?.total) })
            : t("postConfirm", { month: monthLabel(monthKey), total: money(preview.data?.total) }),
      okText: t("post"),
      cancelText: t("cancel"),
      onOk: () => post.mutateAsync().catch(() => {}),
    });
  const confirmUndo = (run) =>
    modal.confirm({
      title: t("undoTitle"),
      content: multipleBranches
        ? t("undoConfirmBranch", { month: monthLabel(run.month), branch: run.branch?.name ?? "" })
        : t("undoConfirm", { month: monthLabel(run.month) }),
      okText: t("undo"),
      okButtonProps: { danger: true },
      cancelText: t("cancel"),
      onOk: () => undo.mutateAsync(run).catch(() => {}),
    });

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-auto">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs">{t("month")}</span>
          <DatePicker picker="month" format="MM/YYYY" value={month} onChange={(value) => value && setMonth(value.startOf("month"))} allowClear={false} />
        </label>
        {/* Only one branch to work on (user assigned to one, or the company has one): it is used automatically. */}
        {inBrowser && multipleBranches ? (
          <label className="flex flex-col gap-1">
            <span className="text-xs">{t("branch")}</span>
            <Select
              allowClear={lockedBranchId == null}
              disabled={lockedBranchId != null}
              className="min-w-44"
              placeholder={t("allBranches")}
              value={selectedBranchId}
              onChange={(value) => setBranchId(value ?? undefined)}
              loading={branchesPending}
              options={accessibleBranches.map((row) => ({ value: Number(row.id), label: String(row.name ?? row.id) }))}
            />
          </label>
        ) : null}
        {access.canAdd ? (
          <Button type="primary" disabled={rows.length === 0 || preview.isError || alreadyPosted} loading={post.isPending} onClick={confirmPost}>
            {t("post")}
          </Button>
        ) : null}
        {settingsAccess.canEdit ? (
          <label className="ms-auto flex items-center gap-2">
            <Switch checked={Boolean(settings.autoDepreciation)} loading={auto.isPending} onChange={(checked) => auto.mutate(checked)} />
            <span>{t("auto")}</span>
          </label>
        ) : null}
      </div>

      {alreadyPosted ? <Alert type="success" showIcon title={t("alreadyPosted", { month: monthLabel(monthKey) })} /> : null}
      {preview.isError ? <Alert type="error" showIcon title={getLocalizedApiErrorMessage(tApiErrors, preview.error)} /> : null}

      {totals.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {totals.map((row) => (
            <Card key={row.category_id} size="small">
              <Typography.Text type="secondary" className="text-xs">
                {row.category_name}
              </Typography.Text>
              <div className="text-base font-semibold">{money(row.amount)}</div>
            </Card>
          ))}
          <Card size="small">
            <Typography.Text type="secondary" className="text-xs">
              {t("total")}
            </Typography.Text>
            <div className="text-base font-semibold">{money(preview.data?.total)}</div>
          </Card>
        </div>
      ) : null}

      <Table
        size="small"
        rowKey="asset_id"
        loading={preview.isFetching}
        dataSource={rows}
        pagination={rows.length > 50 ? { pageSize: 50, showSizeChanger: false } : false}
        locale={{ emptyText: t("nothing") }}
        columns={[
          {
            title: t("asset"),
            dataIndex: "asset_number",
            width: 190,
            render: (value, row) => (
              <Button type="link" className="!px-0 whitespace-nowrap" onClick={() => openStackedDrawer({ featureId: "fixedAssets", id: String(row.asset_id), mode: "view" })}>
                {value || row.name}
              </Button>
            ),
          },
          { title: t("name"), dataIndex: "name", ellipsis: true },
          { title: t("category"), dataIndex: "category_name" },
          { title: t("amount"), dataIndex: "amount", align: "right", render: money },
          { title: t("bookValue"), dataIndex: "book_value_after", align: "right", render: money },
        ]}
        summary={() =>
          rows.length ? (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={3}>
                <strong>{t("total")}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right">
                <strong>{money(preview.data?.total)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4} />
            </Table.Summary.Row>
          ) : null
        }
      />

      <Typography.Title level={5} className="!mb-0">
        {t("history")}
      </Typography.Title>
      <Table
        size="small"
        rowKey="id"
        loading={history.isFetching}
        dataSource={runs}
        pagination={runs.length > 24 ? { pageSize: 24, showSizeChanger: false } : false}
        locale={{ emptyText: t("noRuns") }}
        columns={[
          { title: t("month"), dataIndex: "month", render: monthLabel },
          ...(multipleBranches ? [{ title: t("branch"), key: "branch", render: (_, row) => row.branch?.name ?? "—" }] : []),
          { title: t("total"), dataIndex: "total", align: "right", render: money },
          {
            title: t("status"),
            dataIndex: "status",
            render: (value) => <Tag color={value === "undone" ? "default" : "green"}>{t(value === "undone" ? "undone" : "posted")}</Tag>,
          },
          { title: t("automatic"), dataIndex: "is_automatic", render: (value) => (value ? t("automatic") : t("manualRun")) },
          {
            title: "",
            key: "undo",
            align: "end",
            render: (_, row) =>
              row.can_undo && access.canReverse ? (
                <Button size="small" danger disabled={undo.isPending} onClick={() => confirmUndo(row)}>
                  {t("undo")}
                </Button>
              ) : null,
          },
        ]}
      />
    </div>
  );
}

export default function DepreciationRunPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-40 items-center justify-center">
          <Spin />
        </div>
      }
    >
      <DepreciationRunView />
    </Suspense>
  );
}
