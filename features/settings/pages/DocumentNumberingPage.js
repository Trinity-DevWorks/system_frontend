"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useResourceAccess } from "@/lib/permissions";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { EditOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Card, Input, InputNumber, Space, Spin, Switch, Table, Tag, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import {
  DOCUMENT_NUMBERING_QUERY_KEY,
  fetchDocumentNumberSettings,
  updateDocumentNumberSettings,
} from "../api/documentNumbering.api";

const FIELDS = ["prefix", "include_branch", "include_year", "padding", "start_number"];

/**
 * Same format as the backend DocumentNumberService (prefix-branch-year-counter).
 *
 * @param {Record<string, any>} row
 * @param {number} number
 */
function previewNumber(row, number) {
  const parts = [String(row.prefix ?? "").trim().toUpperCase() || "?"];
  if (row.include_branch) parts.push("B1");
  if (row.include_year) parts.push(String(new Date().getFullYear()));
  parts.push(String(Math.max(1, number)).padStart(Math.max(1, Number(row.padding) || 1), "0"));
  return parts.join("-");
}

export default function DocumentNumberingPage() {
  const t = useTranslations("DocumentNumbering");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, notification } = App.useApp();
  const access = useResourceAccess("document_numbering");
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(/** @type {Record<string, Record<string, any>> | null} */ (null));
  const editing = draft != null;

  const query = useQuery({
    queryKey: DOCUMENT_NUMBERING_QUERY_KEY,
    queryFn: fetchDocumentNumberSettings,
    staleTime: QUERY_STALE_TIME.catalog,
  });
  const rows = useMemo(() => query.data ?? [], [query.data]);

  const saveMutation = useMutation({
    mutationFn: (settings) => updateDocumentNumberSettings(settings),
    onSuccess: (data) => {
      queryClient.setQueryData(DOCUMENT_NUMBERING_QUERY_KEY, data);
      message.success(t("saveSuccess"));
      setDraft(null);
    },
    onError: (err) => {
      notification.error({ title: t("saveError"), description: getLocalizedApiErrorMessage(tApiErrors, err) });
    },
  });

  const startEditing = useCallback(() => {
    setDraft(Object.fromEntries(rows.map((row) => [row.document_type, Object.fromEntries(FIELDS.map((f) => [f, row[f]]))])));
  }, [rows]);

  const patch = (type, field, value) => setDraft((prev) => (prev ? { ...prev, [type]: { ...prev[type], [field]: value } } : prev));

  const changed = useMemo(() => {
    if (!draft) return [];
    return rows
      .filter((row) => FIELDS.some((f) => String(draft[row.document_type]?.[f]) !== String(row[f])))
      .map((row) => ({ document_type: row.document_type, ...draft[row.document_type] }));
  }, [draft, rows]);

  const columns = useMemo(() => {
    const value = (row, field) => (editing ? draft?.[row.document_type]?.[field] : row[field]);
    return [
      {
        title: t("colDocument"),
        key: "document",
        width: 220,
        render: (_, row) => (
          <Space orientation="vertical" size={0}>
            <Typography.Text>{t(`type_${row.document_type}`)}</Typography.Text>
            <Typography.Text type="secondary" className="text-xs">
              {t(`group_${row.group}`)}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: t("colPrefix"),
        key: "prefix",
        width: 110,
        render: (_, row) =>
          editing ? (
            <Input maxLength={6} value={value(row, "prefix")} onChange={(e) => patch(row.document_type, "prefix", e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase())} />
          ) : (
            <Typography.Text code>{row.prefix}</Typography.Text>
          ),
      },
      {
        title: t("colBranch"),
        key: "include_branch",
        width: 100,
        render: (_, row) => <Switch size="small" disabled={!editing} checked={Boolean(value(row, "include_branch"))} onChange={(v) => patch(row.document_type, "include_branch", v)} />,
      },
      {
        title: t("colYear"),
        key: "include_year",
        width: 100,
        render: (_, row) => <Switch size="small" disabled={!editing} checked={Boolean(value(row, "include_year"))} onChange={(v) => patch(row.document_type, "include_year", v)} />,
      },
      {
        title: t("colPadding"),
        key: "padding",
        width: 100,
        render: (_, row) =>
          editing ? <InputNumber min={3} max={8} value={value(row, "padding")} onChange={(v) => patch(row.document_type, "padding", v ?? 6)} /> : row.padding,
      },
      {
        title: t("colStart"),
        key: "start_number",
        width: 140,
        render: (_, row) =>
          editing ? (
            <InputNumber min={row.last_number + 1} value={value(row, "start_number")} onChange={(v) => patch(row.document_type, "start_number", v ?? 1)} />
          ) : (
            row.start_number
          ),
      },
      { title: t("colLastIssued"), dataIndex: "last_number", key: "last_number", width: 110, render: (v) => (v ? v : "—") },
      {
        title: t("colPreview"),
        key: "preview",
        width: 230,
        render: (_, row) => {
          const current = editing ? { ...row, ...draft?.[row.document_type] } : row;
          return <Tag>{previewNumber(current, Math.max(Number(row.last_number) + 1, Number(current.start_number) || 1))}</Tag>;
        },
      },
    ];
  }, [editing, draft, t]);

  if (query.isPending) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <Spin />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <Card
        title={t("title")}
        extra={
          access.canEdit ? (
            editing ? (
              <Space>
                <Button onClick={() => setDraft(null)} disabled={saveMutation.isPending}>
                  {t("cancel")}
                </Button>
                <Button type="primary" loading={saveMutation.isPending} disabled={changed.length === 0} onClick={() => saveMutation.mutate(changed)}>
                  {t("save")}
                </Button>
              </Space>
            ) : (
              <Button icon={<EditOutlined />} onClick={startEditing}>
                {t("edit")}
              </Button>
            )
          ) : null
        }
      >
        <Typography.Paragraph type="secondary">{t("hint")}</Typography.Paragraph>
        {query.isError ? <Alert type="error" showIcon message={getLocalizedApiErrorMessage(tApiErrors, query.error)} /> : null}
        <Table rowKey="document_type" size="small" pagination={false} columns={columns} dataSource={rows} scroll={{ x: 1100 }} />
      </Card>
    </div>
  );
}
