"use client";

import CompanySettingsForm from "../components/CompanySettingsForm";
import { areSettingsFormValuesDirty } from "../utils/settingsFormDirty";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import {
  tenantSettingsQueryKey,
  useTenantSettings,
} from "@/lib/tenant-settings";
import { updateTenantSettings } from "@/lib/api/tenantSettings";
import { EditOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Form, Space, Spin } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

const SETTINGS_FIELD_KEYS = [
  "country",
  "preferred_language",
  "timezone",
  "date_format",
  "number_format",
  "tax_enabled",
  "allow_negative_stock",
  "price_rounding_mode",
  "price_decimal_places",
];

function emptyToNull(value) {
  if (value == null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
}

/** @param {Record<string, unknown>} settings */
function settingsToFormValues(settings) {
  return {
    country: settings.country,
    preferred_language: settings.preferredLanguage,
    timezone: settings.timezone,
    date_format: settings.dateFormat,
    number_format: settings.numberFormat,
    tax_enabled: settings.taxEnabled,
    allow_negative_stock: settings.allowNegativeStock,
    price_rounding_mode: settings.priceRoundingMode,
    price_decimal_places: settings.priceDecimalPlaces,
  };
}

export default function CompanySettingsPage() {
  const t = useTranslations("CompanySettings");
  const tApiErrors = useTranslations("ApiErrors");
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { settings, raw, isLoading, isError, isReady } = useTenantSettings();

  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "";
  const queryKey = tenantSettingsQueryKey(hostname);

  const [isEditing, setIsEditing] = useState(false);
  const [editBaseline, setEditBaseline] = useState(
    /** @type {Record<string, unknown> | null} */ (null),
  );
  const [isDirty, setIsDirty] = useState(false);

  const primaryCurrencyLabel = useMemo(() => {
    if (!raw || typeof raw !== "object") return null;
    const currency = /** @type {Record<string, unknown>} */ (raw).primary_currency;
    if (!currency || typeof currency !== "object") return null;
    const c = /** @type {Record<string, unknown>} */ (currency);
    const code = typeof c.code === "string" ? c.code : "";
    const name = typeof c.name === "string" ? c.name : "";
    if (!code && !name) return null;
    return name ? `${code} — ${name}` : code;
  }, [raw]);

  const serverBaseline = useMemo(
    () => (isReady ? settingsToFormValues(settings) : null),
    [isReady, settings],
  );
  const baseline = isEditing ? editBaseline : serverBaseline;

  const recomputeDirty = useCallback(() => {
    if (!baseline) {
      setIsDirty(false);
      return;
    }
    setIsDirty(
      areSettingsFormValuesDirty(form.getFieldsValue(true), baseline, SETTINGS_FIELD_KEYS),
    );
  }, [baseline, form]);

  useEffect(() => {
    if (!isReady || isEditing || !serverBaseline) return;
    form.setFieldsValue(serverBaseline);
  }, [form, isEditing, isReady, serverBaseline]);

  const saveMutation = useMutation({
    mutationFn: (values) =>
      updateTenantSettings({
        country: emptyToNull(values.country),
        preferred_language: values.preferred_language,
        timezone: values.timezone,
        date_format: values.date_format,
        number_format: values.number_format,
        tax_enabled: Boolean(values.tax_enabled),
        allow_negative_stock: Boolean(values.allow_negative_stock),
        price_rounding_mode: values.price_rounding_mode,
        price_decimal_places: Number(values.price_decimal_places),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
      setIsDirty(false);
      setIsEditing(false);
      setEditBaseline(null);
      message.success(t("saveSuccess"));
    },
    onError: (err) => {
      if (!applyApiFieldErrors(form, err)) {
        message.error(
          getLocalizedApiErrorMessage(tApiErrors, err) || t("saveError"),
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const startEditing = useCallback(() => {
    const values = serverBaseline ?? settingsToFormValues(settings);
    form.setFieldsValue(values);
    setEditBaseline(values);
    setIsDirty(false);
    setIsEditing(true);
  }, [form, serverBaseline, settings]);

  const cancelEditing = useCallback(() => {
    if (editBaseline) form.setFieldsValue(editBaseline);
    setIsDirty(false);
    setIsEditing(false);
    setEditBaseline(null);
  }, [editBaseline, form]);

  const actions = useMemo(() => {
    if (!isEditing) {
      return (
        <Button type="default" icon={<EditOutlined />} onClick={startEditing}>
          {t("edit")}
        </Button>
      );
    }
    return (
      <Space wrap>
        <Button onClick={cancelEditing} disabled={saveMutation.isPending}>
          {t("cancel")}
        </Button>
        <Button
          type={isDirty ? "primary" : "default"}
          disabled={!isDirty}
          loading={saveMutation.isPending}
          onClick={() => form.submit()}
        >
          {t("save")}
        </Button>
      </Space>
    );
  }, [
    cancelEditing,
    form,
    isDirty,
    isEditing,
    saveMutation.isPending,
    startEditing,
    t,
  ]);

  if (isLoading) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <Spin />
      </div>
    );
  }

  if (isError) {
    return <Alert type="error" showIcon title={t("loadError")} />;
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-2 pb-6">
      <div className="flex items-start justify-end gap-3">
        <div className="min-w-0 flex-1">
          <CompanySettingsForm
            form={form}
            t={t}
            primaryCurrencyLabel={primaryCurrencyLabel}
            disabled={!isEditing}
            onValuesChange={recomputeDirty}
            onFinish={(values) => saveMutation.mutate(values)}
          />
        </div>
        {actions}
      </div>
    </div>
  );
}
