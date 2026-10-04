"use client";

import PlatformLogoSection from "../components/PlatformLogoSection";
import PlatformProfileForm from "../components/PlatformProfileForm";
import { updatePlatformProfile } from "../api/platformSettings.api";
import { PLATFORM_PROFILE_QUERY_KEY } from "../queries/platformSettingsQueryKeys";
import { usePlatformProfileQuery } from "../queries/usePlatformSettingsQueries";
import { areSettingsFormValuesDirty } from "@/features/settings";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useCentralResourceAccess } from "@/lib/central-permissions";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import { setPlatformBrandingFromProfile } from "@/lib/platform-branding";
import { APP_DISMISS_BUTTON_PROPS } from "@/shared/components/buttons/appDismissButtonProps";
import { EditOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Card, Form, Space, Spin, Tag, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

const PROFILE_FIELD_KEYS = [
  "name",
  "legal_name",
  "phone",
  "email",
  "website",
  "tax_number",
  "registration_number",
  "address",
];

function emptyToNull(value) {
  if (value == null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
}

/** @param {Record<string, unknown>} profile */
function profileToFormValues(profile) {
  return Object.fromEntries(PROFILE_FIELD_KEYS.map((key) => [key, profile[key] ?? ""]));
}

/** @param {unknown} value */
function trimmed(value) {
  return typeof value === "string" ? value.trim() : "";
}

export default function PlatformProfilePage() {
  const t = useTranslations("CentralPlatformProfile");
  const tApiErrors = useTranslations("ApiErrors");
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { canEdit } = useCentralResourceAccess("platform_profile");
  const { data: profile, isPending, isError } = usePlatformProfileQuery();
  const isReady = Boolean(profile);

  const [isEditing, setIsEditing] = useState(false);
  const [editBaseline, setEditBaseline] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [isDirty, setIsDirty] = useState(false);

  const serverBaseline = useMemo(() => (profile ? profileToFormValues(profile) : null), [profile]);
  const baseline = isEditing ? editBaseline : serverBaseline;

  const recomputeDirty = useCallback(() => {
    if (!baseline) {
      setIsDirty(false);
      return;
    }
    setIsDirty(areSettingsFormValuesDirty(form.getFieldsValue(true), baseline, PROFILE_FIELD_KEYS));
  }, [baseline, form]);

  useEffect(() => {
    if (!isReady || isEditing || !serverBaseline) return;
    form.setFieldsValue(serverBaseline);
  }, [form, isEditing, isReady, serverBaseline]);

  const saveMutation = useMutation({
    mutationFn: (values) =>
      updatePlatformProfile({
        name: trimmed(values.name),
        legal_name: emptyToNull(values.legal_name),
        phone: emptyToNull(values.phone),
        email: emptyToNull(values.email),
        website: emptyToNull(values.website),
        tax_number: emptyToNull(values.tax_number),
        registration_number: emptyToNull(values.registration_number),
        address: emptyToNull(values.address),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(PLATFORM_PROFILE_QUERY_KEY, data);
      setPlatformBrandingFromProfile(queryClient, data);
      setIsEditing(false);
      setEditBaseline(null);
      setIsDirty(false);
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

  if (isError || !profile) {
    return <Alert type="error" showIcon title={t("loadError")} />;
  }

  const displayName = trimmed(profile.name) || "\u2014";
  const displayEmail = trimmed(profile.email);
  const displayPhone = trimmed(profile.phone);
  const displayLegalName = trimmed(profile.legal_name);

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
              logo={/** @type {{ version?: number | null } | null} */ (profile.logo ?? null)}
              name={displayName}
              t={t}
              tApiErrors={tApiErrors}
              readOnly={!isEditing}
            />
            <div className="min-w-0 flex-1 pt-1">
              <Typography.Title level={3} className="!mb-1 !mt-0 truncate">
                {displayName}
              </Typography.Title>
              {displayEmail ? (
                <Typography.Text
                  type="secondary"
                  copyable
                  className="block max-w-full"
                  ellipsis
                  aria-label={t("fieldEmail")}
                >
                  {displayEmail}
                </Typography.Text>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {displayLegalName ? <Tag className="!m-0">{displayLegalName}</Tag> : null}
                {displayPhone ? (
                  <Typography.Text type="secondary" aria-label={t("fieldPhone")}>
                    {displayPhone}
                  </Typography.Text>
                ) : null}
              </div>
              {isEditing ? (
                <Typography.Paragraph type="secondary" className="!mb-0 !mt-2 text-xs">
                  {t("logoHint")}
                </Typography.Paragraph>
              ) : null}
            </div>
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      </Card>

      <Card title={t("companyDetails")}>
        <PlatformProfileForm
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
