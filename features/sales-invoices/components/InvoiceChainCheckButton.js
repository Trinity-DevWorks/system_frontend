"use client";

import { fetchInvoiceChainCheck, runInvoiceChainCheck } from "../api/invoiceChainCheck.api";
import { invoiceChainCheckQueryKey } from "../queries/invoiceChainCheckQueryKeys";
import { SALES_INVOICE_DETAIL_QUERY_PREFIX, SALES_INVOICES_QUERY_KEY } from "../queries/salesInvoicesQueryKeys";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useDrawerHostPresence } from "@/lib/drawer/DrawerHostPresence";
import { formatTenantDateTime } from "@/lib/tenant-format";
import { SafetyCertificateOutlined, SyncOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Alert, Badge, Button, Descriptions, Drawer, Table, Tag, Tooltip, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useState } from "react";

const STATUS_COLORS = { consistent: "success", issues: "warning", failed: "error" };

/**
 * @param {string} value
 */
function shortValue(value) {
  return value.length > 14 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
}

/**
 * @param {{ value: string | null; fallback: string }} props
 */
function MonoValue({ value, fallback }) {
  if (!value) return <Typography.Text type="secondary">{fallback}</Typography.Text>;
  return (
    <Tooltip title={value}>
      <Typography.Text copyable={{ text: value }} className="font-mono text-xs" dir="ltr">
        {shortValue(value)}
      </Typography.Text>
    </Tooltip>
  );
}

/**
 * Toolbar button for the sales invoice list: opens the latest blockchain consistency check
 * and lets users with invoice-proofs edit run a new one.
 *
 * @param {{
 *   canRun: boolean;
 *   onOpenInvoice?: (invoiceId: string) => void;
 * }} props
 */
export default function InvoiceChainCheckButton({ canRun, onOpenInvoice }) {
  const t = useTranslations("InvoiceChainIssues");
  const tApiErrors = useTranslations("ApiErrors");
  const { message } = App.useApp();
  const hostPresence = useDrawerHostPresence();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const queryKey = invoiceChainCheckQueryKey(hostname);

  const stateQuery = useQuery({
    queryKey,
    queryFn: fetchInvoiceChainCheck,
    enabled: Boolean(hostname),
    refetchOnWindowFocus: false,
  });
  const available = Boolean(stateQuery.data?.available);
  const check = stateQuery.data?.check ?? null;

  const runMutation = useMutation({
    mutationFn: runInvoiceChainCheck,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
      queryClient.invalidateQueries({ queryKey: SALES_INVOICES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: SALES_INVOICE_DETAIL_QUERY_PREFIX });
      const status = data?.check?.status;
      if (status === "consistent") message.success(t("runConsistent"));
      else if (status === "issues") message.warning(t("runIssues", { count: data.check.issue_count }));
      else message.error(t("runFailed"));
    },
    onError: (err) => {
      message.error(getLocalizedApiErrorMessage(tApiErrors, err) || t("runError"));
    },
  });

  const columns = [
    {
      title: t("columnProblem"),
      dataIndex: "kind",
      key: "kind",
      render: (kind) => (
        <Tooltip title={t(`kinds.${kind}.hint`)}>
          <Tag
            color={
              kind === "registration_stuck" || kind === "not_submitted" || kind === "not_revoked" ? "warning" : "error"
            }
          >
            {t(`kinds.${kind}.label`)}
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: t("columnInvoice"),
      key: "invoice",
      render: (_, row) => {
        if (!row.invoice_number) return <MonoValue value={row.chain_proof_id} fallback={"\u2014"} />;
        if (!row.invoice_id || !onOpenInvoice) return <Typography.Text>{row.invoice_number}</Typography.Text>;
        return (
          <Tooltip title={t("openInvoice")}>
            <Button
              type="link"
              size="small"
              className="!px-0"
              onClick={() => {
                setOpen(false);
                onOpenInvoice(row.invoice_id);
              }}
            >
              {row.invoice_number}
            </Button>
          </Tooltip>
        );
      },
    },
    {
      title: t("columnExpected"),
      dataIndex: "expected",
      key: "expected",
      render: (value) => <MonoValue value={value} fallback={"\u2014"} />,
    },
    {
      title: t("columnActual"),
      dataIndex: "actual",
      key: "actual",
      render: (value) => <MonoValue value={value} fallback={t("nothing")} />,
    },
  ];

  return (
    <>
      <Badge count={check?.status === "issues" ? check.issue_count : 0} dot={check?.status === "failed"} size="small">
        <Button icon={<SafetyCertificateOutlined />} onClick={() => setOpen(true)}>
          {t("open")}
        </Button>
      </Badge>

      <Drawer
        title={t("title")}
        open={open}
        onClose={() => setOpen(false)}
        afterOpenChange={hostPresence?.afterOpenChange}
        size={720}
        destroyOnHidden
        extra={
          canRun && available ? (
            <Button icon={<SyncOutlined />} loading={runMutation.isPending} onClick={() => runMutation.mutate()}>
              {t("run")}
            </Button>
          ) : null
        }
      >
        <Typography.Paragraph type="secondary" className="text-sm">
          {t("hint")}
        </Typography.Paragraph>

        {stateQuery.isError ? (
          <Alert
            type="error"
            showIcon
            title={getLocalizedApiErrorMessage(tApiErrors, stateQuery.error) || t("loadError")}
          />
        ) : null}

        {stateQuery.isSuccess && !available ? (
          <Alert type="info" showIcon title={t("unavailable")} className="!mb-3" />
        ) : null}

        {stateQuery.isSuccess && !check ? <Typography.Text type="secondary">{t("never")}</Typography.Text> : null}

        {check ? (
          <div className="flex flex-col gap-3">
            <Descriptions size="small" column={{ xs: 1, sm: 2 }} bordered>
              <Descriptions.Item label={t("status")}>
                <Tag color={STATUS_COLORS[check.status]} className="!m-0">
                  {t(`statuses.${check.status}`)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t("lastRun")}>
                {formatTenantDateTime(check.finished_at) || "\u2014"}
              </Descriptions.Item>
              <Descriptions.Item label={t("checked")}>{check.checked_count}</Descriptions.Item>
              <Descriptions.Item label={t("issues")}>{check.issue_count}</Descriptions.Item>
              <Descriptions.Item label={t("requeued")}>{check.requeued_count}</Descriptions.Item>
              <Descriptions.Item label={t("blocks")}>
                {check.scanned_to_block != null
                  ? t("blockRange", { from: check.scanned_from_block ?? 0, to: check.scanned_to_block })
                  : "\u2014"}
              </Descriptions.Item>
            </Descriptions>

            {check.status === "failed" ? (
              <Alert type="error" showIcon title={t("failed")} description={check.error ?? undefined} />
            ) : null}

            {check.issues.length > 0 ? (
              <Table
                rowKey="id"
                size="small"
                columns={columns}
                dataSource={check.issues}
                pagination={check.issues.length > 10 ? { pageSize: 10, size: "small" } : false}
                scroll={{ x: true }}
              />
            ) : null}
            {check.issue_count > check.issues.length ? (
              <Typography.Text type="secondary" className="text-xs">
                {t("issuesTruncated", { shown: check.issues.length, total: check.issue_count })}
              </Typography.Text>
            ) : null}
          </div>
        ) : null}
      </Drawer>
    </>
  );
}
