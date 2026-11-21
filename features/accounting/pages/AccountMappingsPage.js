"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useResourceAccess } from "@/lib/permissions";
import { APP_DISMISS_BUTTON_PROPS } from "@/shared/components/buttons/appDismissButtonProps";
import { EditOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Card, Select, Space, Spin, Table, Tag, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { fetchAccountMappings, updateAccountMappings } from "../api/accounting.api";
import { ACCOUNTS_QUERY_KEY, ACCOUNT_MAPPINGS_QUERY_KEY } from "../queries/accountingQueryKeys";
import { usePostableAccounts } from "../queries/usePostableAccounts";

export default function AccountMappingsPage() {
  const t = useTranslations("Accounting");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, notification } = App.useApp();
  const access = useResourceAccess("account_mappings");
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(/** @type {Record<string, number> | null} */ (null));
  const editing = draft != null;

  const mappingsQuery = useQuery({
    queryKey: ACCOUNT_MAPPINGS_QUERY_KEY,
    queryFn: fetchAccountMappings,
    staleTime: QUERY_STALE_TIME.catalog,
  });
  const { options: accountOptions, isPending: accountsPending } = usePostableAccounts({ enabled: editing });

  const saveMutation = useMutation({
    mutationFn: (/** @type {Record<string, number>} */ mappings) => updateAccountMappings(mappings),
    onSuccess: (rows) => {
      queryClient.setQueryData(ACCOUNT_MAPPINGS_QUERY_KEY, rows);
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
      message.success(t("mappingsSaveSuccess"));
      setDraft(null);
    },
    onError: (err) => {
      notification.error({ title: t("saveError"), description: getLocalizedApiErrorMessage(tApiErrors, err) });
    },
  });

  const rows = useMemo(() => mappingsQuery.data ?? [], [mappingsQuery.data]);

  const startEditing = useCallback(() => {
    setDraft(
      Object.fromEntries(
        rows.filter((row) => row.account_id != null).map((row) => [String(row.role), Number(row.account_id)]),
      ),
    );
  }, [rows]);

  const dirty = useMemo(() => {
    if (!draft) return false;
    return rows.some((row) => Number(draft[String(row.role)] ?? 0) !== Number(row.account_id ?? 0));
  }, [draft, rows]);
  const complete = draft != null && rows.every((row) => draft[String(row.role)] != null);

  const columns = [
    {
      title: t("colRole"),
      dataIndex: "role",
      key: "role",
      width: "40%",
      render: (value, row) => (
        <div className="flex flex-col">
          <span className="font-medium">{t(`role_${value}`)}</span>
          <span className="text-xs text-neutral-500">
            {(row.allowed_types ?? []).map((type) => t(`type_${type}`)).join(" / ")}
            {row.is_controlled ? (
              <Tag className="ms-2" color="gold">
                {t("roleControlled")}
              </Tag>
            ) : null}
          </span>
        </div>
      ),
    },
    {
      title: t("colAccount"),
      dataIndex: "account_id",
      key: "account",
      render: (value, row) => {
        if (!editing) {
          return value != null ? (
            <span>
              <span className="tabular-nums">{row.account_code}</span> {row.account_name}
            </span>
          ) : (
            <Typography.Text type="danger">{t("mappingMissing")}</Typography.Text>
          );
        }
        const allowed = new Set(row.allowed_types ?? []);
        return (
          <Select
            className="w-full"
            showSearch
            optionFilterProp="label"
            loading={accountsPending}
            value={draft?.[String(row.role)]}
            options={accountOptions.filter((option) => allowed.has(option.account.type))}
            onChange={(next) => setDraft((prev) => ({ ...(prev ?? {}), [String(row.role)]: Number(next) }))}
          />
        );
      },
    },
  ];

  if (mappingsQuery.isPending) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <Spin />
      </div>
    );
  }
  if (mappingsQuery.isError) {
    return <Alert type="error" showIcon title={t("mappingsLoadError")} />;
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl min-h-0 min-w-0 flex-col gap-4 pb-6 pt-2">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 pt-1">
            <Typography.Title level={3} className="!mb-1 !mt-0 truncate">
              {t("mappingsTitle")}
            </Typography.Title>
            <Typography.Text type="secondary" className="block max-w-full">
              {t("mappingsDescription")}
            </Typography.Text>
          </div>
          <div className="shrink-0">
            {editing ? (
              <Space wrap>
                <Button {...APP_DISMISS_BUTTON_PROPS} onClick={() => setDraft(null)} disabled={saveMutation.isPending}>
                  {t("drawerCancel")}
                </Button>
                <Button
                  type={dirty ? "primary" : "default"}
                  disabled={!dirty || !complete}
                  loading={saveMutation.isPending}
                  onClick={() => draft && saveMutation.mutate(draft)}
                >
                  {t("drawerSave")}
                </Button>
              </Space>
            ) : access.canEdit ? (
              <Button icon={<EditOutlined />} onClick={startEditing}>
                {t("actionEdit")}
              </Button>
            ) : null}
          </div>
        </div>
      </Card>
      <Card styles={{ body: { padding: 0 } }}>
        <Table size="small" rowKey="role" columns={columns} dataSource={rows} pagination={false} tableLayout="fixed" />
      </Card>
    </div>
  );
}
