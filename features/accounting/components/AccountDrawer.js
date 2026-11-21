"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import { closeConfirmOnError } from "@/lib/drawer/closeConfirmOnError";
import { useCompanySettings } from "@/lib/company-settings";
import { useResourceAccess } from "@/lib/permissions";
import { formatTenantMoneyWithSymbol } from "@/lib/tenant-format";
import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import { useDrawerSubmitShortcut } from "@/shared/components/resource-drawer/useDrawerSubmitShortcut";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { CURRENCIES_LIST_QUERY_KEY, fetchCurrencyNames } from "@/features/currencies";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Descriptions, Form, Input, Select, Space, Switch, Tag } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { createAccount, deleteAccount, fetchAccount, fetchAccounts, updateAccount } from "../api/accounting.api";
import { ACCOUNT_TYPE_VALUES, NORMAL_BALANCE_VALUES, accountLabel } from "../accountingUtils";
import { ACCOUNTS_QUERY_KEY, ACCOUNT_DETAIL_QUERY_PREFIX } from "../queries/accountingQueryKeys";

const EMPTY = {
  parent_id: undefined,
  code: "",
  name: "",
  is_group: false,
  type: undefined,
  normal_balance: undefined,
  currency_id: undefined,
  is_active: true,
  description: "",
};

/** @param {Record<string, unknown>} values */
function toPayload(values) {
  const description = String(values.description ?? "").trim();
  return {
    parent_id: values.parent_id ?? null,
    code: String(values.code ?? "").trim(),
    name: String(values.name ?? "").trim(),
    is_group: Boolean(values.is_group),
    type: values.type ?? null,
    normal_balance: values.normal_balance ?? null,
    currency_id: values.currency_id ?? null,
    is_active: Boolean(values.is_active),
    description: description === "" ? null : description,
  };
}

/** @param {Record<string, unknown>} record */
function toFormValues(record) {
  return {
    parent_id: record.parent_id == null ? undefined : Number(record.parent_id),
    code: String(record.code ?? ""),
    name: String(record.name ?? ""),
    is_group: Boolean(record.is_group),
    type: record.type ?? undefined,
    normal_balance: record.normal_balance ?? undefined,
    currency_id: record.currency_id == null ? undefined : Number(record.currency_id),
    is_active: Boolean(record.is_active),
    description: String(record.description ?? ""),
  };
}

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   accountId: number | null;
 *   tableSeedRecord?: Record<string, unknown> | null;
 *   createSeed?: { parent?: Record<string, unknown> } | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 * }} props
 */
export default function AccountDrawer({ open, mode, accountId, tableSeedRecord = null, createSeed = null, onClose, onCreated }) {
  const t = useTranslations("Accounting");
  const { settings } = useCompanySettings();
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal, notification } = App.useApp();
  const access = useResourceAccess("accounts");
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const baselineRef = useRef("");
  const sessionRef = useRef("");
  const readOnly = mode === "view";

  const detailEnabled = open && accountId != null && mode !== "create";
  const detailQuery = useQuery({
    queryKey: [...ACCOUNT_DETAIL_QUERY_PREFIX, accountId],
    queryFn: () => fetchAccount(/** @type {number} */ (accountId)),
    enabled: detailEnabled,
  });
  const record = detailEnabled ? (detailQuery.data ?? tableSeedRecord) : null;

  const allAccountsQuery = useQuery({
    queryKey: [...ACCOUNTS_QUERY_KEY, "all"],
    queryFn: () => fetchAccounts(),
    enabled: open,
    staleTime: QUERY_STALE_TIME.catalog,
  });
  const currenciesQuery = useQuery({
    queryKey: CURRENCIES_LIST_QUERY_KEY,
    queryFn: fetchCurrencyNames,
    enabled: open,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const parentOptions = useMemo(
    () =>
      (allAccountsQuery.data ?? [])
        .filter((account) => account.is_group && Number(account.id) !== Number(accountId))
        .map((account) => ({ value: Number(account.id), label: accountLabel(account) })),
    [accountId, allAccountsQuery.data],
  );
  const currencyOptions = useMemo(
    () =>
      (currenciesQuery.data ?? []).map((currency) => ({
        value: Number(currency.id),
        label: [currency.code, currency.name].filter(Boolean).join(" — "),
      })),
    [currenciesQuery.data],
  );

  const snapshot = useCallback(() => JSON.stringify(toPayload(form.getFieldsValue(true))), [form]);

  useEffect(() => {
    if (!open) {
      sessionRef.current = "";
      return;
    }
    if (mode === "create") {
      if (sessionRef.current === "create") return;
      sessionRef.current = "create";
      const parent = createSeed?.parent;
      form.setFieldsValue({
        ...EMPTY,
        ...(parent
          ? {
              parent_id: Number(parent.id),
              code: String(parent.code ?? ""),
              type: parent.type ?? undefined,
              normal_balance: parent.normal_balance ?? undefined,
            }
          : {}),
      });
      baselineRef.current = snapshot();
      return;
    }
    if (!detailQuery.data?.id) return;
    const key = `${detailQuery.data.id}:${detailQuery.dataUpdatedAt}`;
    if (sessionRef.current === key) return;
    sessionRef.current = key;
    form.setFieldsValue(toFormValues(detailQuery.data));
    baselineRef.current = snapshot();
  }, [createSeed, detailQuery.data, detailQuery.dataUpdatedAt, form, mode, open, snapshot]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
  }, [queryClient]);

  const saveMutation = useMutation({
    mutationFn: (/** @type {Record<string, unknown>} */ payload) =>
      accountId != null && mode !== "create" ? updateAccount(accountId, payload) : createAccount(payload),
    onSuccess: (saved) => {
      invalidate();
      baselineRef.current = snapshot();
      if (mode === "create") {
        message.success(t("accountCreateSuccess"));
        onCreated?.(saved);
        return;
      }
      message.success(t("accountUpdateSuccess"));
      onClose();
    },
    onError: (err) => {
      if (!applyApiFieldErrors(form, err)) {
        notification.error({ title: t("saveError"), description: getLocalizedApiErrorMessage(tApiErrors, err) });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAccount(/** @type {number} */ (accountId)),
    onSuccess: () => {
      message.success(t("accountDeleteSuccess"));
      invalidate();
      onClose();
    },
    onError: (err) => {
      notification.error({ title: t("accountDeleteError"), description: getLocalizedApiErrorMessage(tApiErrors, err) });
    },
  });

  const submitting = saveMutation.isPending || deleteMutation.isPending;

  const runSave = useCallback(() => {
    form
      .validateFields()
      .then((values) => saveMutation.mutate(toPayload(values)))
      .catch(() => {});
  }, [form, saveMutation]);

  const shouldConfirmDiscard = useCallback(
    () => !readOnly && baselineRef.current !== "" && snapshot() !== baselineRef.current,
    [readOnly, snapshot],
  );
  const { forceClose, requestClose } = useResourceDrawerCloseFlow({ readOnly, modal, t, onClose, shouldConfirmDiscard });

  useDrawerSubmitShortcut({ enabled: open && !readOnly, submitting, onSave: runSave, saveDisabled: submitting });

  const isGroup = Form.useWatch("is_group", form);
  const roles = Array.isArray(record?.roles) ? record.roles : [];
  const hasLines = Boolean(detailQuery.data?.has_lines);
  const hasChildren = Boolean(detailQuery.data?.has_children);
  const mapped = roles.length > 0;
  const canDelete =
    mode === "edit" &&
    access.canDelete &&
    detailQuery.data != null &&
    !detailQuery.data.has_lines &&
    !detailQuery.data.has_children &&
    roles.length === 0;

  const title =
    mode === "create" ? t("accountDrawerCreate") : readOnly ? t("accountDrawerView") : t("accountDrawerEdit");

  return (
    <ResourceCrudDrawer
      title={record?.code ? `${title} · ${record.code}` : title}
      open={open}
      requestClose={requestClose}
      submitting={submitting}
      showDetailLoading={detailEnabled && detailQuery.isLoading && !tableSeedRecord}
      detailLoadFailed={detailEnabled && detailQuery.isError}
      detailError={detailQuery.error}
      tApiErrors={tApiErrors}
      footer={
        readOnly ? (
          <div className="flex w-full justify-end">
            <Button onClick={forceClose}>{t("drawerClose")}</Button>
          </div>
        ) : (
          <div className="flex w-full min-w-0 items-center gap-3">
            {canDelete ? (
              <Button
                danger
                disabled={submitting}
                onClick={() =>
                  modal.confirm({
                    title: t("accountDeleteConfirmTitle"),
                    content: t("accountDeleteConfirmContent", { name: accountLabel(record ?? {}) }),
                    okText: t("actionDelete"),
                    okButtonProps: { danger: true },
                    cancelText: t("drawerCancel"),
                    onOk: () => closeConfirmOnError(deleteMutation.mutateAsync()),
                  })
                }
              >
                {t("actionDelete")}
              </Button>
            ) : null}
            <Space className="ms-auto">
              <Button onClick={requestClose} disabled={submitting}>
                {t("drawerCancel")}
              </Button>
              <Button type="primary" loading={submitting} onClick={runSave}>
                {t("drawerSave")}
              </Button>
            </Space>
          </div>
        )
      }
    >
      {mode !== "create" && record ? (
        <Descriptions size="small" column={1} className="mb-4">
          <Descriptions.Item label={t("colBalance")}>
            {formatTenantMoneyWithSymbol(record.balance ?? 0, settings.primaryCurrencySymbol)}
          </Descriptions.Item>
          {roles.length > 0 ? (
            <Descriptions.Item label={t("colRoles")}>
              <div className="flex flex-wrap gap-1">
                {roles.map((role) => (
                  <Tag key={role} className="m-0" color="blue">
                    {t(`role_${role}`)}
                  </Tag>
                ))}
              </div>
            </Descriptions.Item>
          ) : null}
        </Descriptions>
      ) : null}
      <Form form={form} layout="vertical" requiredMark={readOnly ? false : "optional"} disabled={readOnly || submitting}>
        <Form.Item name="parent_id" label={t("fieldParent")} extra={t("fieldParentHelp")}>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            options={parentOptions}
            loading={allAccountsQuery.isPending}
            placeholder={t("fieldParentPlaceholder")}
          />
        </Form.Item>
        <Form.Item
          name="code"
          label={t("fieldCode")}
          rules={[
            { required: true, message: t("fieldCodeRequired") },
            { pattern: /^[0-9]+$/, message: t("fieldCodeDigits") },
            { max: 20, message: t("fieldCodeMax") },
          ]}
        >
          <Input autoComplete="off" inputMode="numeric" disabled={readOnly || hasChildren} />
        </Form.Item>
        <Form.Item name="name" label={t("fieldName")} rules={[{ required: true, message: t("fieldNameRequired") }, { max: 255 }]}>
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item name="is_group" label={t("fieldIsGroup")} valuePropName="checked" extra={t("fieldIsGroupHelp")}>
          <Switch disabled={readOnly || hasLines || hasChildren || mapped} />
        </Form.Item>
        <Form.Item
          name="type"
          label={t("fieldType")}
          rules={isGroup ? [] : [{ required: true, message: t("fieldTypeRequired") }]}
        >
          <Select
            allowClear
            options={ACCOUNT_TYPE_VALUES.map((value) => ({ value, label: t(`type_${value}`) }))}
            disabled={readOnly || hasLines}
          />
        </Form.Item>
        <Form.Item
          name="normal_balance"
          label={t("fieldNormalBalance")}
          rules={isGroup ? [] : [{ required: true, message: t("fieldNormalBalanceRequired") }]}
        >
          <Select
            allowClear
            options={NORMAL_BALANCE_VALUES.map((value) => ({ value, label: t(`balance_${value}`) }))}
          />
        </Form.Item>
        <Form.Item name="currency_id" label={t("fieldCurrency")} extra={t("fieldCurrencyHelp")}>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            options={currencyOptions}
            loading={currenciesQuery.isPending}
            disabled={readOnly || hasLines}
          />
        </Form.Item>
        <Form.Item name="is_active" label={t("fieldStatus")} valuePropName="checked">
          <Switch checkedChildren={t("statusActive")} unCheckedChildren={t("statusInactive")} />
        </Form.Item>
        <Form.Item name="description" label={t("fieldDescription")}>
          <Input.TextArea rows={3} maxLength={2000} />
        </Form.Item>
      </Form>
    </ResourceCrudDrawer>
  );
}
