"use client";

import CompanySettingsForm from "./CompanySettingsForm";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import {
  tenantSettingsQueryKey,
  useTenantSettings,
} from "@/lib/tenant-settings";
import { updateTenantSettings } from "@/services/tenantSettingsApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Form, Spin } from "antd";
import { useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";

function emptyToNull(value) {
  if (value == null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
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

  useEffect(() => {
    if (!isReady) return;
    form.setFieldsValue({
      country: settings.country,
      preferred_language: settings.preferredLanguage,
      timezone: settings.timezone,
      date_format: settings.dateFormat,
      number_format: settings.numberFormat,
      tax_enabled: settings.taxEnabled,
      allow_negative_stock: settings.allowNegativeStock,
      price_rounding_mode: settings.priceRoundingMode,
      price_decimal_places: settings.priceDecimalPlaces,
    });
  }, [form, isReady, settings]);

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
      <CompanySettingsForm
        form={form}
        t={t}
        primaryCurrencyLabel={primaryCurrencyLabel}
        onFinish={(values) => saveMutation.mutate(values)}
      />
      <div>
        <Button
          type="primary"
          loading={saveMutation.isPending}
          onClick={() => form.submit()}
        >
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
