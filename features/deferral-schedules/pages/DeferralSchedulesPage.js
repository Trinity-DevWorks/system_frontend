"use client";

import { useForwardArrow } from "@/lib/direction-arrow";
import { useGlobalDrawer } from "@/lib/drawer/GlobalDrawerContext";
import { usePageDrawer } from "@/lib/drawer/usePageDrawer";
import { useResourceAccess } from "@/lib/permissions";
import {
  formatTenantDate,
  formatTenantMoneyWithSymbol,
} from "@/lib/tenant-format";
import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import {
  stockFilterFieldRowClassName,
  useStockTableFilters,
} from "@/features/stock/components/StockTableFilters/StockTableFilters";
import AppDataTable from "@/shared/components/tables/AppDataTable";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { MoreOutlined } from "@ant-design/icons";
import { App, Button, Dropdown, Form, Progress, Select, Spin, Tag } from "antd";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { Suspense, useMemo, useState } from "react";
import {
  activateDeferralSchedule,
  deleteDeferralSchedule,
  pauseDeferralSchedule,
  postDueDeferralSchedule,
  resumeDeferralSchedule,
} from "../api/deferralSchedules.api";
import { fetchDeferralSchedules } from "../api/deferralSchedules.api";
import DeferralActionDialog from "../components/DeferralActionDialog";
import { DEFERRAL_SCHEDULES_LIST_QUERY_KEY } from "../queries/deferralSchedulesQueryKeys";

function DeferralSchedulesContent() {
  const t = useTranslations("DeferralSchedules");
  const arrow = useForwardArrow();
  const tApiErrors = useTranslations("ApiErrors");
  const { notification, message, modal } = App.useApp();
  const access = useResourceAccess("deferral_schedules");
  const { openDrawer } = useGlobalDrawer();
  const { openCreateDrawer, openViewDrawer, openEditDrawer } =
    usePageDrawer("deferralSchedules");
  const [status, setStatus] = useState("");
  const [kind, setKind] = useState("");
  const table = useTenantPaginatedTable({
    queryKey: DEFERRAL_SCHEDULES_LIST_QUERY_KEY,
    queryFn: fetchDeferralSchedules,
    tableId: "deferral-schedules",
    extraParams: { ...(status ? { status } : {}), ...(kind ? { kind } : {}) },
    t,
    tApiErrors,
    notification,
  });

  // A month is due when it is still pending and dated today or earlier.
  const isDue = (row) =>
    row.status === "active" &&
    Boolean(row.next_posting_date) &&
    String(row.next_posting_date).slice(0, 10) <= dayjs().format("YYYY-MM-DD");

  const confirmPostAll = () =>
    modal.confirm({
      title: t("postAllDueTitle"),
      content: t("postAllDueContent"),
      okText: t("postAllDue"),
      cancelText: t("drawerCancel"),
      onOk: () => postAll(),
    });

  const postAll = async () => {
    const due = (table.rows ?? []).filter(isDue);
    let posted = 0;
    for (const row of due) {
      try {
        const result = await postDueDeferralSchedule(String(row.id));
        posted += Number(result?.posted ?? 0);
      } catch (err) {
        notification.error({
          title: t("actionError"),
          description: getLocalizedApiErrorMessage(tApiErrors, err),
        });
      }
    }
    message.success(t("postDueDone", { count: posted }));
    table.refetch();
  };

  // Row-menu actions that need no extra input run here; the others open the drawer at their dialog.
  const runAction = (name, run, danger = false) =>
    modal.confirm({
      title: t(`${name}Title`),
      content: t(`${name}Content`),
      okText: t(`action${name[0].toUpperCase()}${name.slice(1)}`),
      okButtonProps: danger ? { danger: true } : undefined,
      cancelText: t("drawerCancel"),
      onOk: () =>
        run()
          .then((data) => {
            const warnings = data?.warnings ?? data?.schedule?.warnings;
            if (Array.isArray(warnings) && warnings.length) {
              modal.warning({
                title: t("balanceWarning"),
                content: warnings.map((w) => w.message).join(" "),
              });
            }
            message.success(
              name === "postDue"
                ? t("postDueDone", { count: Number(data?.posted ?? 0) })
                : t(`${name}Success`),
            );
            table.refetch();
          })
          .catch((err) =>
            notification.error({
              title: t("actionError"),
              description: getLocalizedApiErrorMessage(tApiErrors, err),
            }),
          ),
    });
  // Reschedule / Recognise / Cancel open their dialog right here, without the drawer.
  const [dialogFor, setDialogFor] = useState(
    /** @type {{ row: Record<string, any>; dialog: "reschedule" | "recognize" | "cancel" } | null} */ (
      null
    ),
  );
  const openAtDialog = (row, dialog) => setDialogFor({ row, dialog });

  const rowMenu = (row) => {
    const id = String(row.id);
    const s = row.status;
    const open = s === "active" || s === "paused";
    return [
      access.canView && {
        key: "view",
        label: t("actionView"),
        onClick: () => openViewDrawer(row),
      },
      access.canEdit &&
        s === "draft" && {
          key: "edit",
          label: t("actionEdit"),
          onClick: () => openEditDrawer(row),
        },
      access.canEdit &&
        s === "draft" && {
          key: "activate",
          label: t("actionActivate"),
          onClick: () =>
            runAction("activate", () => activateDeferralSchedule(id)),
        },
      access.canEdit &&
        isDue(row) && {
          key: "postDue",
          label: t("actionPostDue"),
          onClick: () =>
            runAction("postDue", () => postDueDeferralSchedule(id)),
        },
      access.canEdit &&
        s === "active" && {
          key: "pause",
          label: t("actionPause"),
          onClick: () => runAction("pause", () => pauseDeferralSchedule(id)),
        },
      access.canEdit &&
        s === "paused" && {
          key: "resume",
          label: t("actionResume"),
          onClick: () => runAction("resume", () => resumeDeferralSchedule(id)),
        },
      access.canEdit &&
        open && {
          key: "reschedule",
          label: t("actionReschedule"),
          onClick: () => openAtDialog(row, "reschedule"),
        },
      access.canEdit &&
        s === "active" && {
          key: "recognize",
          label: t("actionRecognize"),
          onClick: () => openAtDialog(row, "recognize"),
        },
      access.canEdit &&
        access.canReverse &&
        open &&
        Number(row.posted_lines_count ?? 0) === 0 && {
          key: "cancel",
          label: t("actionCancelSchedule"),
          danger: true,
          onClick: () => openAtDialog(row, "cancel"),
        },
      access.canDelete &&
        s === "draft" && {
          key: "delete",
          label: t("actionDelete"),
          danger: true,
          onClick: () =>
            runAction("delete", () => deleteDeferralSchedule(id), true),
        },
    ].filter(Boolean);
  };

  const columns = useMemo(
    () => [
      {
        title: t("colNumber"),
        dataIndex: "schedule_number",
        width: 150,
        render: (value) => value || "—",
      },
      { title: t("colName"), dataIndex: "name", width: 240, ellipsis: true },
      {
        title: t("colKind"),
        dataIndex: "kind",
        width: 150,
        render: (value) => <Tag>{t(`kind_${value}`)}</Tag>,
      },
      {
        title: t("colDeferralAccount"),
        key: "deferral",
        width: 220,
        ellipsis: true,
        render: (_, row) =>
          row.deferral_account ? (
            // dir="auto": English names keep "code — name" order and are cut at the end in Arabic.
            <span dir="auto" className="block truncate">
              {`${row.deferral_account.code} — ${row.deferral_account.name}`}
            </span>
          ) : (
            "—"
          ),
      },
      {
        title: t("colRecognitionAccount"),
        key: "recognition",
        width: 220,
        ellipsis: true,
        render: (_, row) =>
          row.recognition_account ? (
            <span dir="auto" className="block truncate">
              {`${row.recognition_account.code} — ${row.recognition_account.name}`}
            </span>
          ) : (
            "—"
          ),
      },
      {
        title: t("colPeriod"),
        key: "period",
        width: 200,
        render: (_, row) =>
          `${formatTenantDate(row.start_date)} ${arrow} ${formatTenantDate(row.end_date)}`,
      },
      {
        title: t("colRemaining"),
        dataIndex: "remaining_amount",
        width: 150,
        align: "right",
        render: (value, row) =>
          formatTenantMoneyWithSymbol(
            value,
            row.currency?.symbol || row.currency?.code || "",
          ),
      },
      {
        title: t("colProgress"),
        key: "progress",
        width: 140,
        render: (_, row) => {
          const total = Number(row.total_amount) || 0;
          const recognized = Number(row.recognized_amount) || 0;
          return (
            <Progress
              percent={total > 0 ? Math.round((recognized / total) * 100) : 0}
              size="small"
            />
          );
        },
      },
      {
        title: t("colNext"),
        dataIndex: "next_posting_date",
        width: 120,
        render: (value) => (value ? formatTenantDate(value) : "—"),
      },
      {
        title: t("colSource"),
        key: "source",
        // Wide enough for a voucher number; longer text is cut with "…" instead of spilling into Status.
        width: 210,
        ellipsis: true,
        render: (_, row) =>
          row.source?.number && row.source?.type === "expense_voucher" ? (
            <Button
              type="link"
              className="!h-auto max-w-full truncate !px-0"
              title={row.source.number}
              onClick={() =>
                openDrawer({
                  featureId: "expenseVouchers",
                  id: String(row.source.id),
                  mode: "view",
                })
              }
            >
              {row.source.number}
            </Button>
          ) : (
            row.source?.number || t(`source_${row.source?.type ?? "manual"}`)
          ),
      },
      {
        title: t("colStatus"),
        dataIndex: "status",
        width: 120,
        render: (value) => (
          <Tag
            color={
              { active: "green", paused: "gold", completed: "blue" }[value] ??
              "default"
            }
          >
            {t(`status_${value}`)}
          </Tag>
        ),
      },
      {
        title: t("colActions"),
        key: "actions",
        fixed: "end",
        width: 72,
        align: "center",
        render: (_, row) => {
          const items = rowMenu(row);
          if (!items.length) return null;
          return (
            <Dropdown menu={{ items }} trigger={["click"]}>
              <Button
                type="text"
                size="small"
                icon={<MoreOutlined />}
                aria-label={t("actionMenu")}
              />
            </Dropdown>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      openDrawer,
      t,
      access.canView,
      access.canEdit,
      access.canDelete,
      access.canReverse,
      arrow,
    ],
  );

  const statuses = ["draft", "active", "paused", "completed", "cancelled"];
  const kinds = ["prepaid_expense", "deferred_revenue"];
  const filterSummary = [
    ...(status
      ? [{ label: t("filterStatus"), value: t(`status_${status}`) }]
      : []),
    ...(kind ? [{ label: t("filterKind"), value: t(`kind_${kind}`) }] : []),
  ];
  const { toggle: filterToggle, filterBar } = useStockTableFilters({
    activeCount: filterSummary.length,
    summary: filterSummary,
    onClearAll: () => {
      setStatus("");
      setKind("");
    },
    children: (
      <div className={stockFilterFieldRowClassName}>
        <Form.Item label={t("filterStatus")}>
          <Select
            allowClear
            className="w-full"
            placeholder={t("allStatuses")}
            value={status || undefined}
            onChange={(value) => setStatus(value ?? "")}
            options={statuses.map((value) => ({
              value,
              label: t(`status_${value}`),
            }))}
          />
        </Form.Item>
        <Form.Item label={t("filterKind")}>
          <Select
            allowClear
            className="w-full"
            placeholder={t("allKinds")}
            value={kind || undefined}
            onChange={(value) => setKind(value ?? "")}
            options={kinds.map((value) => ({
              value,
              label: t(`kind_${value}`),
            }))}
          />
        </Form.Item>
      </div>
    ),
  });

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="deferral-schedules"
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
          filterBar,
          extra: (
            <>
              {filterToggle}
              {access.canEdit ? (
                <Button
                  onClick={confirmPostAll}
                  disabled={!(table.rows ?? []).some(isDue)}
                >
                  {t("postAllDue")}
                </Button>
              ) : null}
            </>
          ),
        }}
        stickyHeader
        scrollX={2000}
        pagination={table.pagination}
      />
      <DeferralActionDialog
        dialog={dialogFor?.dialog ?? null}
        record={dialogFor?.row ?? null}
        onClose={() => setDialogFor(null)}
        onDone={() => table.refetch()}
      />
    </div>
  );
}

export default function DeferralSchedulesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <Spin />
        </div>
      }
    >
      <DeferralSchedulesContent />
    </Suspense>
  );
}
