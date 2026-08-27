"use client";

import CompanySettingsForm from "../components/CompanySettingsForm";
import { areSettingsFormValuesDirty } from "../utils/settingsFormDirty";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import {
  companySettingsQueryKey,
  useCompanySettings,
} from "@/lib/company-settings";
import { updateCompanySettings } from "@/lib/api/companySettings";
import { EditOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Card, Form, Space, Spin, Tag, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

const SETTINGS_FIELD_KEYS = [
  "country",
  "preferred_language",
  "timezone",
  "date_format",
  "number_format",
  "tax_enabled",
  "tax_price_mode",
  "allow_negative_stock",
  "inventory_costing_method",
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
    tax_price_mode: settings.taxPriceMode,
    allow_negative_stock: settings.allowNegativeStock,
    inventory_costing_method: settings.inventoryCostingMethod,
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
  const { settings, raw, isLoading, isError, isReady } = useCompanySettings();

  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "";
  const queryKey = companySettingsQueryKey(hostname);

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
      updateCompanySettings({
        country: emptyToNull(values.country),
        preferred_language: values.preferred_language,
        timezone: values.timezone,
        date_format: values.date_format,
        number_format: values.number_format,
        tax_enabled: Boolean(values.tax_enabled),
        tax_price_mode: values.tax_price_mode,
        allow_negative_stock: Boolean(values.allow_negative_stock),
        inventory_costing_method: values.inventory_costing_method,
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

  const displayCountry =
    typeof settings.country === "string" ? settings.country.trim() : "";
  const languageLabel =
    settings.preferredLanguage === "ar"
      ? t("languageAr")
      : settings.preferredLanguage === "en"
        ? t("languageEn")
        : "";
  const displayTimezone =
    typeof settings.timezone === "string" ? settings.timezone.trim() : "";
  const currencyNote = primaryCurrencyLabel
    ? t("primaryCurrencyReadonly", { currency: primaryCurrencyLabel })
    : t("primaryCurrencyEmpty");

  return (
    <div className="mx-auto flex w-full max-w-2xl min-h-0 min-w-0 flex-col gap-4 pb-6 pt-2">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 pt-1">
            <Typography.Title level={3} className="!mb-1 !mt-0 truncate">
              {t("title")}
            </Typography.Title>
            <Typography.Text type="secondary" className="block max-w-full">
              {currencyNote}
            </Typography.Text>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {displayCountry ? <Tag className="!m-0">{displayCountry}</Tag> : null}
              {languageLabel ? <Tag className="!m-0">{languageLabel}</Tag> : null}
              {displayTimezone ? <Tag className="!m-0">{displayTimezone}</Tag> : null}
            </div>
          </div>
          <div className="shrink-0">{actions}</div>
        </div>
      </Card>

      <Card title={t("regionalSettings")}>
        <CompanySettingsForm
          form={form}
          t={t}
          disabled={!isEditing}
          onValuesChange={recomputeDirty}
          onFinish={(values) => saveMutation.mutate(values)}
        />
      </Card>
    </div>
  );
}
