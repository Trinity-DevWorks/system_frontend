"use client";

import PlatformLogoSection from "../components/PlatformLogoSection";
import { updatePlatformSettings } from "../api/platformSettings.api";
import { PLATFORM_SETTINGS_QUERY_KEY } from "../queries/platformSettingsQueryKeys";
import { usePlatformSettingsQuery } from "../queries/usePlatformSettingsQueries";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useCentralResourceAccess } from "@/lib/central-permissions";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import { setPlatformBranding } from "@/lib/platform-branding";
import { APP_DISMISS_BUTTON_PROPS } from "@/shared/components/buttons/appDismissButtonProps";
import { EditOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Card, Form, Input, Space, Spin, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

/** Mirrors backend `UpdatePlatformBrandingRequest`. */
const NAME_MAX = 80;

/** @param {unknown} value */
function trimmed(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Platform branding: the product name and logo shown in the sidebars, login pages,
 * browser titles and favicon on every host.
 */
export default function PlatformSettingsPage() {
  const t = useTranslations("CentralPlatformSettings");
  const tApiErrors = useTranslations("ApiErrors");
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { canEdit } = useCentralResourceAccess("platform_settings");
  const { data: settings, isPending, isError } = usePlatformSettingsQuery();

  const [isEditing, setIsEditing] = useState(false);
  const nameValue = Form.useWatch("name", form);
  const isDirty = isEditing && trimmed(nameValue) !== trimmed(settings?.name);

  // Outside edit mode the form mirrors the saved name (also after a save or cancel).
  useEffect(() => {
    if (!isEditing && settings) form.setFieldsValue({ name: settings.name ?? "" });
  }, [form, isEditing, settings]);

  const saveMutation = useMutation({
    mutationFn: (values) => updatePlatformSettings({ name: trimmed(values.name) }),
    onSuccess: (data) => {
      queryClient.setQueryData(PLATFORM_SETTINGS_QUERY_KEY, data);
      setPlatformBranding(queryClient, data);
      setIsEditing(false);
      message.success(t("saveSuccess"));
    },
    onError: (err) => {
      if (!applyApiFieldErrors(form, err)) {
        message.error(getLocalizedApiErrorMessage(tApiErrors, err) || t("saveError"));
      }
    },
  });

  const startEditing = useCallback(() => setIsEditing(true), []);
  const cancelEditing = useCallback(() => setIsEditing(false), []);

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

  const displayName = trimmed(settings.name) || "—";

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
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <PlatformLogoSection
              branding={settings}
              name={displayName}
              t={t}
              tApiErrors={tApiErrors}
              readOnly={!canEdit}
            />
            <div className="min-w-0 flex-1 pt-1">
              <Typography.Title level={3} className="!mb-1 !mt-0 truncate">
                {displayName}
              </Typography.Title>
              <Typography.Paragraph type="secondary" className="!mb-0">
                {t("subtitle")}
              </Typography.Paragraph>
              {canEdit ? (
                <Typography.Paragraph type="secondary" className="!mb-0 !mt-2 text-xs">
                  {t("logoHint")}
                </Typography.Paragraph>
              ) : null}
            </div>
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      </Card>

      <Card title={t("branding")}>
        <Form
          form={form}
          layout="vertical"
          requiredMark={isEditing ? "optional" : false}
          disabled={!isEditing}
          onFinish={(values) => saveMutation.mutate(values)}
        >
          <Form.Item
            name="name"
            label={t("fieldName")}
            extra={isEditing ? t("fieldNameHelp") : undefined}
            rules={[
              { required: true, whitespace: true, message: t("fieldNameRequired") },
              { max: NAME_MAX, message: t("fieldNameMax", { max: NAME_MAX }) },
            ]}
          >
            <Input autoComplete="organization" maxLength={NAME_MAX} />
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
