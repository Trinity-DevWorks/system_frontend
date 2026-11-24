"use client";

import { ROUTES } from "@/features/registry";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { withLocalePrefix } from "@/lib/locale-path";
import { useResourceAccess } from "@/lib/permissions";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { invalidateTenantListQueries } from "@/lib/tables/tenantListCache";
import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { formatTenantDateTime } from "@/lib/tenant-format";
import AppDataTable from "@/shared/components/tables/AppDataTable";
import { CloudDownloadOutlined, EyeOutlined, SettingOutlined, SyncOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Badge, Button, Card, Drawer, Empty, Spin, Table, Tabs, Tag, Typography } from "antd";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import {
  SCALE_EXPORTS_QUERY_KEY,
  SCALE_EXPORT_STATUS_QUERY_KEY,
  downloadScaleExport,
  fetchScaleExport,
  fetchScaleExports,
} from "../api/scaleExports.api";
import { useScaleExportStatus } from "../hooks/useScaleExportStatus";

/** @param {{ row: Record<string, any>; t: any; canExport: boolean; onDownload: (onlyChanged: boolean) => void; busy: string | null }} props */
function TemplateCard({ row, t, canExport, onDownload, busy }) {
  const last = row.last_export;
  const changed = Number(row.changed_count ?? 0);
  return (
    <Card size="small" className="h-full">
      <div className="flex items-start justify-between gap-2">
        <Typography.Text strong className="text-base">
          {row.template_name}
        </Typography.Text>
        {row.never_exported ? (
          <Tag color="orange">{t("neverExported")}</Tag>
        ) : changed > 0 ? (
          <Badge count={changed} overflowCount={999} title={t("changedCount", { count: changed })} />
        ) : (
          <Tag color="green">{t("upToDate")}</Tag>
        )}
      </div>
      <div className="mt-2 flex flex-col gap-1 text-sm">
        <Typography.Text type="secondary">{t("itemsOnScale", { count: row.item_count ?? 0 })}</Typography.Text>
        {last ? (
          <Typography.Text type="secondary">
            {t("lastExport", { date: formatTenantDateTime(last.created_at), user: last.user?.name ?? "—", count: last.item_count ?? 0 })}
          </Typography.Text>
        ) : null}
        {changed > 0 && !row.never_exported ? <Typography.Text type="warning">{t("changedCount", { count: changed })}</Typography.Text> : null}
        {Number(row.missing_price_count ?? 0) > 0 ? (
          <Typography.Text type="danger">{t("missingListPrice", { count: Number(row.missing_price_count) })}</Typography.Text>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="primary"
          icon={<CloudDownloadOutlined />}
          disabled={!canExport || row.item_count === 0}
          loading={busy === `${row.template_id}:all`}
          onClick={() => onDownload(false)}
        >
          {t("downloadAll")}
        </Button>
        <Button
          icon={<SyncOutlined />}
          disabled={!canExport || changed === 0 || row.never_exported}
          loading={busy === `${row.template_id}:changed`}
          onClick={() => onDownload(true)}
        >
          {t("downloadChanged")}
        </Button>
      </div>
    </Card>
  );
}

function ExportCards() {
  const t = useTranslations("ScaleExports");
  const tApiErrors = useTranslations("ApiErrors");
  const locale = useLocale();
  const { notification, message } = App.useApp();
  const access = useResourceAccess("scale_exports");
  const templatesAccess = useResourceAccess("scale_barcode_formats");
  const queryClient = useQueryClient();
  const status = useScaleExportStatus(true);
  const [busy, setBusy] = useState(/** @type {string | null} */ (null));

  const download = useMutation({
    mutationFn: ({ id, onlyChanged }) => downloadScaleExport(id, onlyChanged),
    onMutate: ({ id, onlyChanged }) => setBusy(`${id}:${onlyChanged ? "changed" : "all"}`),
    onSettled: () => setBusy(null),
    onSuccess: () => {
      message.success(t("downloaded"));
      queryClient.invalidateQueries({ queryKey: SCALE_EXPORT_STATUS_QUERY_KEY });
      invalidateTenantListQueries(queryClient, SCALE_EXPORTS_QUERY_KEY);
    },
    onError: (error) => notification.error({ title: t("downloadError"), description: getLocalizedApiErrorMessage(tApiErrors, error) }),
  });

  if (status.isPending) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <Spin />
      </div>
    );
  }
  if (status.isError) {
    return <Alert type="error" showIcon title={getLocalizedApiErrorMessage(tApiErrors, status.error)} action={<Button size="small" onClick={() => status.refetch()}>{t("retry")}</Button>} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <Alert type="info" showIcon title={t("pageHelp")} />
      {status.rows.length === 0 ? (
        <Empty description={t("noTemplates")}>
          {templatesAccess.canView ? (
            <Link href={withLocalePrefix(locale, ROUTES.scaleExportTemplates)}>
              <Button icon={<SettingOutlined />}>{t("manageTemplates")}</Button>
            </Link>
          ) : null}
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {status.rows.map((row) => (
            <TemplateCard
              key={row.template_id}
              row={row}
              t={t}
              canExport={access.canExport}
              busy={busy}
              onDownload={(onlyChanged) => download.mutate({ id: row.template_id, onlyChanged })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ExportHistory() {
  const t = useTranslations("ScaleExports");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification } = App.useApp();
  const [openId, setOpenId] = useState(/** @type {number | null} */ (null));
  const table = useTenantPaginatedTable({
    queryKey: SCALE_EXPORTS_QUERY_KEY,
    queryFn: fetchScaleExports,
    staleTime: QUERY_STALE_TIME.inbox,
    tableId: "scale-exports",
    t,
    tApiErrors,
    notification,
  });
  const detail = useQuery({
    queryKey: [...SCALE_EXPORTS_QUERY_KEY, "detail", openId],
    queryFn: () => fetchScaleExport(/** @type {number} */ (openId)),
    enabled: openId != null,
  });

  const columns = useMemo(
    () => [
      { title: t("historyDate"), dataIndex: "created_at", key: "created_at", width: 180, render: (v) => formatTenantDateTime(v) },
      { title: t("historyTemplate"), key: "template", width: 200, ellipsis: true, render: (_, r) => r.template?.name ?? "—" },
      { title: t("historyKind"), dataIndex: "only_changed", key: "only_changed", width: 140, render: (v) => <Tag color={v ? "blue" : "default"}>{v ? t("kindChanged") : t("kindAll")}</Tag> },
      { title: t("historyItems"), dataIndex: "item_count", key: "item_count", width: 100, align: "right" },
      { title: t("historyUser"), key: "user", width: 160, ellipsis: true, render: (_, r) => r.user?.name ?? "—" },
      { title: t("historyBranch"), key: "branch", width: 150, ellipsis: true, render: (_, r) => r.branch?.name ?? t("allBranches") },
      { title: t("historyFile"), dataIndex: "file_name", key: "file_name", width: 260, ellipsis: true },
      {
        title: t("colActions"),
        key: "actions",
        fixed: "end",
        width: 72,
        align: "center",
        render: (_, r) => <Button type="text" size="small" icon={<EyeOutlined />} aria-label={t("actionView")} onClick={() => setOpenId(Number(r.id))} />,
      },
    ],
    [t],
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppDataTable
        tableId="scale-exports"
        columns={columns}
        dataSource={table.rows}
        rowKey="id"
        loading={table.isPending}
        refreshFetching={table.isFetching}
        onRetry={() => table.refetch()}
        emptyText={t("historyEmpty")}
        toolbar={{ showSearch: false, showAdd: false, showRefresh: true, onRefresh: () => table.refetch() }}
        onRow={(record) => ({ onDoubleClick: () => setOpenId(Number(record.id)) })}
        stickyHeader
        scrollX={1260}
        pagination={table.pagination}
      />
      <Drawer
        open={openId != null}
        onClose={() => setOpenId(null)}
        size={560}
        title={detail.data ? `${detail.data.template?.name ?? ""} — ${formatTenantDateTime(detail.data.created_at)}` : t("historyDetail")}
      >
        {detail.isPending ? (
          <Spin />
        ) : detail.isError ? (
          <Alert type="error" showIcon title={getLocalizedApiErrorMessage(tApiErrors, detail.error)} />
        ) : (
          <>
            <Typography.Paragraph type="secondary">
              {t("historyDetailSummary", { count: detail.data?.item_count ?? 0, user: detail.data?.user?.name ?? "—", file: detail.data?.file_name ?? "" })}
            </Typography.Paragraph>
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={detail.data?.items ?? []}
              columns={[
                { title: t("field_plu"), dataIndex: "plu_code", key: "plu", width: 90 },
                { title: t("field_item_code"), dataIndex: "item_code", key: "code", width: 120 },
                { title: t("field_name"), dataIndex: "name", key: "name" },
              ]}
            />
          </>
        )}
      </Drawer>
    </div>
  );
}

export default function ScaleExportPage() {
  const t = useTranslations("ScaleExports");
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center">
            <Spin />
          </div>
        }
      >
        <Tabs
          className="!-mt-3 min-h-0 flex-1"
          items={[
            { key: "export", label: t("tabExport"), children: <ExportCards /> },
            { key: "history", label: t("tabHistory"), children: <ExportHistory /> },
          ]}
        />
      </Suspense>
    </div>
  );
}
