"use client";

import {
  createFixedAsset,
  fetchAssetCategories,
  fetchFixedAsset,
  updateFixedAsset,
} from "@/features/fixed-assets/api/fixedAssets.api";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useCompanySettings } from "@/lib/company-settings";
import { useResourceAccess } from "@/lib/permissions";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { invalidateTenantListQueries } from "@/lib/tables/tenantListCache";
import { formatTenantDate, formatTenantMoneyWithSymbol } from "@/lib/tenant-format";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import ResourceCrudDrawer from "@/shared/components/resource-drawer/ResourceCrudDrawer";
import ResourceDrawerFooter from "@/shared/components/resource-drawer/ResourceDrawerFooter";
import { notifyPersistedSaveIntent, usePersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import { useResourceDrawerCloseFlow } from "@/shared/components/resource-drawer/useResourceDrawerCloseFlow";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, ConfigProvider, DatePicker, Divider, Form, Input, InputNumber, Select } from "antd";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FixedAssetStatusTag from "./FixedAssetStatusTag";

const SAVE_INTENT_KEY = "fixedAssetDrawer:createSaveIntent";
const SAVE_INTENT_EVENT = "fixedAssetDrawer:createSaveIntent:change";
const createDefaults = () => ({ opening_accumulated: 0, acquisition_date: dayjs(), in_service_date: dayjs() });

const QUERY_KEY = /** @type {const} */ (["tenant", "fixed-assets"]);
const METHODS = ["straight_line", "declining_balance"];

/** @param {Record<string, any>} asset */
function toFormValues(asset) {
  return {
    name: asset.name ?? "",
    category_id: asset.category_id ?? undefined,
    serial_number: asset.serial_number ?? "",
    location: asset.location ?? "",
    custodian: asset.custodian ?? "",
    acquisition_date: asset.acquisition_date ? dayjs(asset.acquisition_date) : null,
    in_service_date: asset.in_service_date ? dayjs(asset.in_service_date) : null,
    cost: asset.cost != null ? Number(asset.cost) : undefined,
    salvage_value: asset.salvage_value != null ? Number(asset.salvage_value) : undefined,
    method: asset.method ?? undefined,
    useful_life_months: asset.useful_life_months ?? undefined,
    declining_rate: asset.declining_rate != null ? Number(asset.declining_rate) : undefined,
    opening_accumulated: asset.opening_accumulated != null ? Number(asset.opening_accumulated) : 0,
  };
}

/**
 * Fixed asset card: details, depreciation history and schedule, source document,
 * and the life-cycle actions (activate, change estimate, dispose, reverse disposal).
 *
 * @param {{ open: boolean; mode: "create" | "edit" | "view"; assetId: string | null; onClose: () => void; onCreated?: (record: unknown) => void }} props
 */
export default function FixedAssetDrawer({ open, mode, assetId, onClose, onCreated }) {
  const t = useTranslations("FixedAssets");
  const tApiErrors = useTranslations("ApiErrors");
  const access = useResourceAccess("fixed_assets");
  const { settings } = useCompanySettings();
  const { notification, message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  // True only after the user edits the form (programmatic fills do not count).
  const [dirty, setDirty] = useState(false);
  const creating = mode === "create" || assetId == null;
  const required = (label) => [{ required: true, message: t("fieldRequired", { field: label }) }];
  const money = (value) => (value == null ? "—" : formatTenantMoneyWithSymbol(value, settings.primaryCurrencySymbol ?? ""));

  const detail = useQuery({
    queryKey: [...QUERY_KEY, "detail", assetId],
    queryFn: () => fetchFixedAsset(String(assetId)),
    enabled: open && !creating,
  });
  const asset = /** @type {Record<string, any> | null} */ (detail.data && typeof detail.data === "object" ? detail.data : null);
  const status = creating ? "draft" : (asset?.status ?? "draft");
  const draft = status === "draft";
  const readOnly = mode === "view" || status === "disposed" || (creating ? !access.canAdd : !access.canEdit);
  const method = Form.useWatch("method", form);

  const categories = useQuery({
    queryKey: ["tenant", "fixed-asset-categories", "options"],
    queryFn: () => fetchAssetCategories({ per_page: 200 }),
    enabled: open,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  // Fill the form once per opening (or after a refetch of the saved asset).
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
        form.setFieldsValue(createDefaults());
        setDirty(false);
      }
      return;
    }
    const stamp = `${assetId}:${detail.dataUpdatedAt}`;
    if (asset && loadedFor.current !== stamp) {
      loadedFor.current = stamp;
      form.resetFields();
      form.setFieldsValue(toFormValues(asset));
      setDirty(false);
    }
  }, [open, creating, assetId, asset, detail.dataUpdatedAt, form]);

  const { forceClose, requestClose } = useResourceDrawerCloseFlow({
    readOnly,
    modal,
    t,
    onClose,
    shouldConfirmDiscard: () => dirty,
  });

  const refresh = (record) => {
    invalidateTenantListQueries(queryClient, QUERY_KEY);
    if (record && typeof record === "object" && !creating) queryClient.setQueryData([...QUERY_KEY, "detail", assetId], record);
    else queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, "detail", assetId] });
  };

  const save = useMutation({
    mutationFn: ({ values }) => {
      const body = {
        ...values,
        acquisition_date: values.acquisition_date ? dayjs(values.acquisition_date).format("YYYY-MM-DD") : undefined,
        in_service_date: values.in_service_date ? dayjs(values.in_service_date).format("YYYY-MM-DD") : undefined,
      };
      if (!draft) {
        return updateFixedAsset(String(assetId), { name: body.name, serial_number: body.serial_number, location: body.location, custodian: body.custodian });
      }
      return creating ? createFixedAsset(body) : updateFixedAsset(String(assetId), body);
    },
    onSuccess: (record, { intent }) => {
      message.success(t("saved"));
      refresh(record);
      if (creating) {
        try {
          localStorage.setItem(SAVE_INTENT_KEY, intent);
        } catch {
          /* ignore */
        }
        notifyPersistedSaveIntent(SAVE_INTENT_EVENT);
        onCreated?.(record);
        if (intent === "keep") {
          setDirty(false);
          return;
        }
        if (intent === "new") {
          form.resetFields();
          form.setFieldsValue(createDefaults());
          setDirty(false);
          return;
        }
        forceClose();
      } else {
        form.resetFields();
        form.setFieldsValue(toFormValues(/** @type {Record<string, any>} */ (record)));
        setDirty(false);
      }
    },
    onError: (error) => notification.error({ title: t("saveError"), description: getLocalizedApiErrorMessage(tApiErrors, error) }),
  });
  const busy = save.isPending;

  const categoryOptions = (categories.data?.rows ?? []).map((row) => ({ value: Number(row.id), label: `${row.code} — ${row.name}`, disabled: row.is_active === false }));
  // Show the asset's own category while the option list is still loading (avoids a bare id in the field).
  if (asset?.category && asset.category_id != null && !categoryOptions.some((o) => o.value === Number(asset.category_id))) {
    categoryOptions.push({ value: Number(asset.category_id), label: [asset.category.code, asset.category.name].filter(Boolean).join(" — "), disabled: true });
  }

  const detailsTab = (
    <>
      {status === "disposed" && asset ? (
        <Alert
          type="warning"
          showIcon
          className="mb-4"
          title={t("disposedInfo", { date: formatTenantDate(asset.disposed_at) || "—", amount: money(asset.disposal_amount ?? 0), number: asset.disposal_number ?? "" })}
        />
      ) : null}
      <Form form={form} layout="vertical" disabled={readOnly} requiredMark={readOnly ? false : "optional"} onValuesChange={() => setDirty(true)}>
        <div className="grid grid-cols-1 gap-x-4 md:grid-cols-3">
          <Form.Item name="name" label={t("name")} rules={required(t("name"))} className="md:col-span-2">
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item name="category_id" label={t("category")} rules={required(t("category"))}>
            <Select showSearch optionFilterProp="label" options={categoryOptions} loading={categories.isPending} disabled={readOnly || !draft} />
          </Form.Item>
          <Form.Item name="serial_number" label={t("serial")}>
            <Input maxLength={128} />
          </Form.Item>
          <Form.Item name="location" label={t("location")}>
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item name="custodian" label={t("custodian")}>
            <Input maxLength={255} />
          </Form.Item>
        </div>
        {/* Same fields as "add"; after activation the values are locked (use Change estimate). */}
        <ConfigProvider componentDisabled={readOnly || !draft}>
          <>
            <Divider titlePlacement="start" className="!mt-0">
              {t("sectionValue")}
            </Divider>
            <div className="grid grid-cols-1 gap-x-4 md:grid-cols-3">
              <Form.Item name="acquisition_date" label={t("acquired")} rules={required(t("acquired"))}>
                <DatePicker className="w-full" />
              </Form.Item>
              <Form.Item name="in_service_date" label={t("inService")} rules={required(t("inService"))}>
                <DatePicker className="w-full" />
              </Form.Item>
              <Form.Item name="cost" label={t("cost")} rules={required(t("cost"))}>
                <TenantNumberInput kind="money" min={0.01} className="w-full" addonAfter={settings.primaryCurrencySymbol || undefined} />
              </Form.Item>
              <Form.Item name="method" label={t("method")} extra={t("fromCategoryHelp")}>
                <Select allowClear options={METHODS.map((value) => ({ value, label: t(value) }))} />
              </Form.Item>
              <Form.Item name="useful_life_months" label={t("life")} extra={t("fromCategoryHelp")}>
                <InputNumber min={1} max={1200} style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item name="salvage_value" label={t("salvage")} extra={t("fromCategoryHelp")}>
                <TenantNumberInput kind="money" min={0} className="w-full" addonAfter={settings.primaryCurrencySymbol || undefined} />
              </Form.Item>
              {method === "declining_balance" ? (
                <Form.Item name="declining_rate" label={t("rate")}>
                  <InputNumber min={0.01} max={100} style={{ width: "100%" }} />
                </Form.Item>
              ) : null}
            </div>
            <Divider titlePlacement="start" className="!mt-0">
              {t("sectionOpening")}
            </Divider>
            <div className="grid grid-cols-1 items-end gap-x-4 md:grid-cols-3">
              <Form.Item name="opening_accumulated" label={t("opening")}>
                <TenantNumberInput kind="money" min={0} className="w-full" addonAfter={settings.primaryCurrencySymbol || undefined} />
              </Form.Item>
              {draft && asset?.suggested_opening != null && !readOnly ? (
                <Form.Item>
                  <Button
                    onClick={() => {
                      form.setFieldValue("opening_accumulated", Number(asset.suggested_opening));
                      setDirty(true);
                    }}
                  >
                    {t("useSuggested")} ({money(asset.suggested_opening)})
                  </Button>
                </Form.Item>
              ) : null}
            </div>
          </>
        </ConfigProvider>
      </Form>
    </>
  );

  const lastCreateIntent = usePersistedSaveIntent(SAVE_INTENT_KEY, SAVE_INTENT_EVENT);
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
      .then((values) => save.mutate({ values, intent: "keep" }))
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

  const footer = (
    <ResourceDrawerFooter
      mode={readOnly ? "view" : creating ? "create" : "edit"}
      readOnly={readOnly}
      t={t}
      forceClose={forceClose}
      requestClose={requestClose}
      submitting={busy}
      createSaveDisabled={busy}
      lastCreateIntent={lastCreateIntent}
      runCreate={runCreate}
      createIntentLabel={createIntentLabel}
      createSaveMenuItems={createSaveMenuItems}
      handleEditSubmit={handleEditSubmit}
      editSaveDisabled={busy}
      canSubmitRequired
      fetchRemoteDetail={!creating}
      detailEnabled={!creating}
      detailQueryError={detail.isError}
    />
  );

  return (
    <ResourceCrudDrawer
      title={creating ? t("add") : asset?.asset_number || asset?.name || t("title")}
      titleExtra={!creating && asset ? <FixedAssetStatusTag status={status} t={t} /> : null}
      open={open}
      requestClose={requestClose}
      submitting={busy}
      showDetailLoading={!creating && detail.isPending}
      detailLoadFailed={!creating && detail.isError}
      detailError={detail.error}
      tApiErrors={tApiErrors}
      size={960}
      documentBranch={asset ?? null}
      footer={footer}
    >
      {detailsTab}

    </ResourceCrudDrawer>
  );
}
