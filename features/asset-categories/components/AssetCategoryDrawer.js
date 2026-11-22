"use client";

import { fetchAccounts } from "@/features/accounting/api/accounting.api";
import { createAssetCategory, fetchAssetCategory, fetchAssetCategoryDefaults, updateAssetCategory } from "@/features/fixed-assets/api/fixedAssets.api";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useResourceAccess } from "@/lib/permissions";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { invalidateTenantListQueries } from "@/lib/tables/tenantListCache";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import ResourceDrawerFooter from "@/shared/components/resource-drawer/ResourceDrawerFooter";
import ResourceDrawerPanelHeader from "@/shared/components/resource-drawer/ResourceDrawerPanelHeader";
import { notifyPersistedSaveIntent, usePersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Divider, Form, Input, Select, Space, Switch, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const QUERY_KEY = /** @type {const} */ (["tenant", "fixed-asset-categories"]);
const SAVE_INTENT_KEY = "assetCategoryDrawer:createSaveIntent";
const SAVE_INTENT_EVENT = "assetCategoryDrawer:createSaveIntent:change";

/** @param {unknown[] | undefined} rows */
function accountOptions(rows) {
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => row && row.is_group !== true)
    .map((row) => ({ value: Number(row.id), label: [row.code, row.name].filter(Boolean).join(" — ") }));
}

/** @param {Record<string, any>} record */
function toFormValues(record) {
  return {
    code: record.code ?? "",
    name: record.name ?? "",
    method: record.method ?? "straight_line",
    useful_life_months: record.useful_life_months != null ? Number(record.useful_life_months) : 60,
    declining_rate: record.declining_rate != null ? Number(record.declining_rate) : undefined,
    salvage_percent: record.salvage_percent != null ? Number(record.salvage_percent) : 0,
    prorate_first_month: Boolean(record.prorate_first_month),
    is_active: record.is_active !== false,
    asset_account_id: record.asset_account_id ?? undefined,
    accumulated_account_id: record.accumulated_account_id ?? undefined,
    expense_account_id: record.expense_account_id ?? undefined,
    disposal_loss_account_id: record.disposal_loss_account_id ?? undefined,
    disposal_gain_account_id: record.disposal_gain_account_id ?? undefined,
  };
}

/**
 * A number input with a fixed unit shown on its right (same look as the VAT percentage field).
 *
 * @param {{ name: string; unit: string; kind: "integer" | "percent"; min: number; max: number; rules?: any[]; disabled?: boolean }} props
 */
function NumberWithUnit({ name, unit, kind, min, max, rules, disabled }) {
  return (
    <Space.Compact block className="w-full">
      <div className="min-w-0 flex-1">
        <Form.Item name={name} noStyle rules={rules}>
          <TenantNumberInput kind={kind} min={min} max={max} controls={false} style={{ width: "100%" }} disabled={disabled} />
        </Form.Item>
      </div>
      <Input readOnly value={unit} tabIndex={-1} aria-hidden style={{ width: unit.length > 2 ? 96 : 44, flex: "none" }} styles={{ input: { textAlign: "center" } }} />
    </Space.Compact>
  );
}

/**
 * A switch on the right of a short title and explanation, inside a bordered row.
 *
 * @param {{ name: string; title: string; help: string; disabled?: boolean }} props
 */
function SwitchRow({ name, title, help, disabled }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4 rounded-md border border-solid border-[var(--ant-color-border-secondary)] px-4 py-3">
      <div className="min-w-0">
        <div className="font-medium">{title}</div>
        <Typography.Text type="secondary" className="text-sm">
          {help}
        </Typography.Text>
      </div>
      <Form.Item name={name} valuePropName="checked" noStyle>
        <Switch disabled={disabled} />
      </Form.Item>
    </div>
  );
}

/**
 * Asset category: depreciation defaults and the five accounts its assets post to.
 *
 * @param {{ open: boolean; mode: "create" | "edit" | "view"; categoryId: number | null; tableSeedRecord?: Record<string, any> | null; onClose: () => void; onCreated?: (record: unknown) => void }} props
 */
export default function AssetCategoryDrawer({ open, mode, categoryId, tableSeedRecord = null, onClose, onCreated }) {
  const t = useTranslations("AssetCategories");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification, message, modal } = App.useApp();
  const access = useResourceAccess("fixed_asset_categories");
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const creating = mode === "create" || categoryId == null;
  const readOnly = mode === "view" || (creating ? !access.canAdd : !access.canEdit);
  const method = Form.useWatch("method", form);
  const lifeMonths = Form.useWatch("useful_life_months", form);
  // True only after the user edits the form (programmatic fills do not count).
  const [dirty, setDirty] = useState(false);
  const lastCreateIntent = usePersistedSaveIntent(SAVE_INTENT_KEY, SAVE_INTENT_EVENT);
  const required = (label) => [{ required: true, message: t("fieldRequired", { field: label }) }];

  const detail = useQuery({
    queryKey: [...QUERY_KEY, "detail", categoryId],
    queryFn: () => fetchAssetCategory(/** @type {number} */ (categoryId)),
    enabled: open && !creating,
    placeholderData: tableSeedRecord ?? undefined,
  });
  const accounts = useQuery({
    queryKey: ["tenant", "accounts", "fixed-asset-category"],
    queryFn: () =>
      Promise.all([
        fetchAccounts({ type: "asset", postable: true, active: true }),
        fetchAccounts({ type: "expense", postable: true, active: true }),
        fetchAccounts({ type: "revenue", postable: true, active: true }),
      ]),
    enabled: open,
    staleTime: QUERY_STALE_TIME.catalog,
  });
  const defaults = useQuery({
    queryKey: [...QUERY_KEY, "defaults"],
    queryFn: fetchAssetCategoryDefaults,
    enabled: open && creating,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  // Fill the form once per opening; account defaults only go into fields the user has not touched yet.
  const loadedFor = useRef(/** @type {string | null} */ (null));
  useEffect(() => {
    if (!open) {
      loadedFor.current = null;
      return;
    }
    if (creating) {
      if (loadedFor.current !== "create") {
        loadedFor.current = "create";
        form.resetFields();
        form.setFieldsValue(toFormValues({}));
        setDirty(false);
      }
      const d = defaults.data;
      if (d) {
        const patch = {};
        for (const key of ["accumulated_account_id", "expense_account_id", "disposal_loss_account_id", "disposal_gain_account_id"]) {
          if (d[key]?.id != null && !form.isFieldTouched(key) && form.getFieldValue(key) == null) patch[key] = Number(d[key].id);
        }
        if (Object.keys(patch).length) form.setFieldsValue(patch);
      }
      return;
    }
    const record = detail.data;
    const stamp = `${categoryId}:${detail.dataUpdatedAt}`;
    if (record && loadedFor.current !== stamp) {
      loadedFor.current = stamp;
      form.resetFields();
      form.setFieldsValue(toFormValues(record));
      setDirty(false);
    }
  }, [open, creating, categoryId, detail.data, detail.dataUpdatedAt, defaults.data, form]);

  const { forceClose, requestClose } = useResourceDrawerCloseFlow({
    readOnly,
    modal,
    t,
    onClose,
    shouldConfirmDiscard: () => dirty,
  });

  const save = useMutation({
    mutationFn: ({ values }) => (creating ? createAssetCategory(values) : updateAssetCategory(/** @type {number} */ (categoryId), values)),
    onSuccess: (record, { intent }) => {
      message.success(t("saved"));
      invalidateTenantListQueries(queryClient, QUERY_KEY);
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, "options"] });
      if (!creating) {
        forceClose();
        return;
      }
      try {
        localStorage.setItem(SAVE_INTENT_KEY, intent);
      } catch {
        /* ignore */
      }
      notifyPersistedSaveIntent(SAVE_INTENT_EVENT);
      if (intent === "keep") {
        // Keep the drawer open with what was entered (same as the other drawers).
        setDirty(false);
        onCreated?.(record);
        return;
      }
      if (intent === "new") {
        // Fresh form with the default accounts again.
        loadedFor.current = null;
        form.resetFields();
        form.setFieldsValue(toFormValues({}));
        const d = defaults.data;
        if (d) {
          const patch = {};
          for (const key of ["accumulated_account_id", "expense_account_id", "disposal_loss_account_id", "disposal_gain_account_id"]) {
            if (d[key]?.id != null) patch[key] = Number(d[key].id);
          }
          form.setFieldsValue(patch);
        }
        loadedFor.current = "create";
        setDirty(false);
        return;
      }
      forceClose();
    },
    onError: (error) => notification.error({ title: t("saveError"), description: getLocalizedApiErrorMessage(tApiErrors, error) }),
  });

  const runCreate = useCallback(
    (intent) => {
      form
        .validateFields()
        .then((values) => save.mutate({ values, intent }))
        .catch(() => {});
    },
    [form, save],
  );
  const handleEditSubmit = useCallback(() => {
    if (readOnly) return;
    form
      .validateFields()
      .then((values) => save.mutate({ values, intent: "close" }))
      .catch(() => {});
  }, [readOnly, form, save]);
  const createIntentLabel = useCallback(
    (intent) => (intent === "keep" ? t("drawerSave") : intent === "new" ? t("drawerSaveAndNew") : t("drawerSaveAndClose")),
    [t],
  );
  const createSaveMenuItems = useMemo(
    () => ["keep", "new", "close"].filter((key) => key !== lastCreateIntent).map((key) => ({ key, label: createIntentLabel(key) })),
    [lastCreateIntent, createIntentLabel],
  );

  const [assetOptions, expenseOptions, revenueOptions] = useMemo(() => {
    const [assets, expenses, revenues] = accounts.data ?? [[], [], []];
    return [accountOptions(assets), accountOptions(expenses), accountOptions(revenues)];
  }, [accounts.data]);

  const accountSelect = (options) => (
    <Select
      showSearch
      optionFilterProp="label"
      options={options}
      loading={accounts.isPending}
      placeholder={t("accountPlaceholder")}
      getPopupContainer={drawerSelectGetPopup}
    />
  );

  const years = Number(lifeMonths) > 0 ? Math.round((Number(lifeMonths) / 12) * 10) / 10 : null;
  const title = creating ? t("add") : readOnly ? (detail.data?.name ?? t("title")) : `${t("edit")} ${detail.data?.code ?? ""}`;

  return (
    <ResourceCrudDrawer
      title={title}
      open={open}
      requestClose={requestClose}
      submitting={save.isPending}
      showDetailLoading={!creating && detail.isPending}
      detailLoadFailed={!creating && detail.isError}
      detailError={detail.error}
      tApiErrors={tApiErrors}
      size={720}
      footer={
        <ResourceDrawerFooter
          mode={readOnly ? "view" : creating ? "create" : "edit"}
          readOnly={readOnly}
          t={t}
          forceClose={forceClose}
          requestClose={requestClose}
          submitting={save.isPending}
          createSaveDisabled={save.isPending}
          lastCreateIntent={lastCreateIntent}
          runCreate={runCreate}
          createIntentLabel={createIntentLabel}
          createSaveMenuItems={createSaveMenuItems}
          handleEditSubmit={handleEditSubmit}
          canSubmitRequired
          fetchRemoteDetail={!creating}
          detailEnabled={!creating}
          detailQueryError={detail.isError}
        />
      }
    >
      <Form
        form={form}
        layout="vertical"
        disabled={readOnly}
        requiredMark={readOnly ? false : "optional"}
        onValuesChange={() => setDirty(true)}
      >
        <section>
          <ResourceDrawerPanelHeader title={t("sectionGeneral")} />
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <Form.Item name="code" label={t("code")} rules={required(t("code"))}>
              <Input maxLength={32} placeholder="VEH" />
            </Form.Item>
            <Form.Item name="name" label={t("name")} rules={required(t("name"))}>
              <Input maxLength={255} />
            </Form.Item>
          </div>
          <SwitchRow name="is_active" title={t("active")} help={t("activeHelp")} disabled={readOnly} />
        </section>

        <Divider className="!mb-6 !mt-2" />

        <section>
          <ResourceDrawerPanelHeader title={t("sectionDepreciation")} description={t("sectionDepreciationHelp")} />
          <Form.Item name="method" label={t("method")} rules={required(t("method"))}>
            <Select
              getPopupContainer={drawerSelectGetPopup}
              options={[
                { value: "straight_line", label: t("straight_line") },
                { value: "declining_balance", label: t("declining_balance") },
              ]}
            />
          </Form.Item>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Form.Item
              label={t("life")}
              required={!readOnly}
              extra={years != null ? t("lifeYears", { years }) : t("lifeHelp")}
            >
              <NumberWithUnit name="useful_life_months" unit={t("unitMonths")} kind="integer" min={1} max={1200} rules={required(t("life"))} disabled={readOnly} />
            </Form.Item>
            <Form.Item label={t("salvage")} required={!readOnly} extra={t("salvageHelp")}>
              <NumberWithUnit name="salvage_percent" unit="%" kind="percent" min={0} max={100} rules={required(t("salvage"))} disabled={readOnly} />
            </Form.Item>
          </div>
          {method === "declining_balance" ? (
            <Form.Item label={t("rate")} extra={t("rateHelp")}>
              <NumberWithUnit name="declining_rate" unit={t("unitPerYear")} kind="percent" min={0.01} max={100} disabled={readOnly} />
            </Form.Item>
          ) : null}
          <SwitchRow name="prorate_first_month" title={t("prorate")} help={t("prorateHelp")} disabled={readOnly} />
        </section>

        <Divider className="!mb-6 !mt-2" />

        <section>
          <ResourceDrawerPanelHeader title={t("sectionAccounts")} description={t("accountsHelp")} />
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Form.Item name="asset_account_id" label={t("assetAccount")} rules={required(t("assetAccount"))}>
              {accountSelect(assetOptions)}
            </Form.Item>
            <Form.Item name="accumulated_account_id" label={t("accumulatedAccount")} rules={required(t("accumulatedAccount"))}>
              {accountSelect(assetOptions)}
            </Form.Item>
          </div>
          <Form.Item name="expense_account_id" label={t("expenseAccount")} rules={required(t("expenseAccount"))}>
            {accountSelect(expenseOptions)}
          </Form.Item>

          <Typography.Text strong className="mb-1 block">
            {t("sectionDisposal")}
          </Typography.Text>
          <Typography.Paragraph type="secondary" className="!mb-3 text-sm">
            {t("disposalHelp")}
          </Typography.Paragraph>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Form.Item name="disposal_loss_account_id" label={t("lossAccount")} rules={required(t("lossAccount"))}>
              {accountSelect(expenseOptions)}
            </Form.Item>
            <Form.Item name="disposal_gain_account_id" label={t("gainAccount")} rules={required(t("gainAccount"))}>
              {accountSelect(revenueOptions)}
            </Form.Item>
          </div>
        </section>
      </Form>
    </ResourceCrudDrawer>
  );
}
