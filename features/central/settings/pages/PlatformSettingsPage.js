"use client";

import PlatformSettingsForm from "../components/PlatformSettingsForm";
import { updatePlatformSettings } from "../api/platformSettings.api";
import { PLATFORM_SETTINGS_QUERY_KEY } from "../queries/platformSettingsQueryKeys";
import { usePlatformSettingsQuery } from "../queries/usePlatformSettingsQueries";
import { areSettingsFormValuesDirty } from "@/features/settings";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useCentralResourceAccess } from "@/lib/central-permissions";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import { setPlatformBrandingFromSettings } from "@/lib/platform-branding";
import { APP_DISMISS_BUTTON_PROPS } from "@/shared/components/buttons/appDismissButtonProps";
import { EditOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Card, Form, Space, Spin, Tag, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

const SETTINGS_FIELD_KEYS = ["preferred_language", "timezone", "date_format", "number_format"];

/** @param {Record<string, unknown>} settings */
function settingsToFormValues(settings) {
  return Object.fromEntries(SETTINGS_FIELD_KEYS.map((key) => [key, settings[key] ?? null]));
}

export default function PlatformSettingsPage() {
  const t = useTranslations("CentralPlatformSettings");
  const tApiErrors = useTranslations("ApiErrors");
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { canEdit } = useCentralResourceAccess("platform_settings");
  const { data: settings, isPending, isError } = usePlatformSettingsQuery();
  const isReady = Boolean(settings);

  const [isEditing, setIsEditing] = useState(false);
  const [editBaseline, setEditBaseline] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [isDirty, setIsDirty] = useState(false);

  const serverBaseline = useMemo(() => (settings ? settingsToFormValues(settings) : null), [settings]);
  const baseline = isEditing ? editBaseline : serverBaseline;

  const recomputeDirty = useCallback(() => {
    if (!baseline) {
      setIsDirty(false);
      return;
    }
    setIsDirty(areSettingsFormValuesDirty(form.getFieldsValue(true), baseline, SETTINGS_FIELD_KEYS));
  }, [baseline, form]);

  useEffect(() => {
    if (!isReady || isEditing || !serverBaseline) return;
    form.setFieldsValue(serverBaseline);
  }, [form, isEditing, isReady, serverBaseline]);

  const saveMutation = useMutation({
    mutationFn: (values) =>
      updatePlatformSettings({
        preferred_language: values.preferred_language,
        timezone: values.timezone,
        date_format: values.date_format,
        number_format: values.number_format,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(PLATFORM_SETTINGS_QUERY_KEY, data);
      setPlatformBrandingFromSettings(queryClient, data);
      setIsDirty(false);
      setIsEditing(false);
      setEditBaseline(null);
      message.success(t("saveSuccess"));
    },
    onError: (err) => {
      if (!applyApiFieldErrors(form, err)) {
        message.error(getLocalizedApiErrorMessage(tApiErrors, err) || t("saveError"));
      }
    },
  });

  const startEditing = useCallback(() => {
    if (!serverBaseline) return;
    form.setFieldsValue(serverBaseline);
    setEditBaseline(serverBaseline);
    setIsDirty(false);
    setIsEditing(true);
  }, [form, serverBaseline]);

  const cancelEditing = useCallback(() => {
    if (editBaseline) form.setFieldsValue(editBaseline);
    setIsDirty(false);
    setIsEditing(false);
    setEditBaseline(null);
  }, [editBaseline, form]);

  if (isPending) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <Spin />
      </div>
    );
  }

  if (isError || !settings) {
    return <Alert type="error" showIcon title={t("loadError")} />;
  }

  const languageLabel =
    settings.preferred_language === "ar"
      ? t("languageAr")
      : settings.preferred_language === "en"
        ? t("languageEn")
        : "";
  const displayTimezone = typeof settings.timezone === "string" ? settings.timezone.trim() : "";

  let actions = null;
  if (canEdit && !isEditing) {
    actions = (
      <Button type="default" icon={<EditOutlined />} onClick={startEditing}>
        {t("edit")}
      </Button>
    );
  } else if (isEditing) {
    actions = (
      <Space wrap>
        <Button {...APP_DISMISS_BUTTON_PROPS} onClick={cancelEditing} disabled={saveMutation.isPending}>
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
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl min-h-0 min-w-0 flex-col gap-4 pb-6 pt-2">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 pt-1">
            <Typography.Title level={3} className="!mb-1 !mt-0 truncate">
              {t("title")}
            </Typography.Title>
            <Typography.Text type="secondary" className="block max-w-full">
              {t("subtitle")}
            </Typography.Text>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {languageLabel ? <Tag className="!m-0">{languageLabel}</Tag> : null}
              {displayTimezone ? <Tag className="!m-0">{displayTimezone}</Tag> : null}
            </div>
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      </Card>

      <Card title={t("regionalSettings")}>
        <PlatformSettingsForm
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
