"use client";

import CompanyProfileForm from "../components/CompanyProfileForm";
import CompanyProfileLogoSection from "../components/CompanyProfileLogoSection";
import { areSettingsFormValuesDirty } from "../utils/settingsFormDirty";
import {
  companyProfileQueryKey,
  useCompanyProfile,
} from "../queries/companyProfile";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { updateCompanyProfile } from "../api/companyProfile.api";
import { EditOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Form, Space, Spin } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

const PROFILE_FIELD_KEYS = [
  "company_name",
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
  return {
    company_name: profile.company_name,
    legal_name: profile.legal_name,
    phone: profile.phone,
    email: profile.email,
    website: profile.website,
    tax_number: profile.tax_number,
    registration_number: profile.registration_number,
    address: profile.address,
  };
}

export default function CompanyProfilePage() {
  const t = useTranslations("CompanyProfile");
  const tApiErrors = useTranslations("ApiErrors");
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { profile, isLoading, isError, isReady, queryKey } = useCompanyProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [editBaseline, setEditBaseline] = useState(
    /** @type {Record<string, unknown> | null} */ (null),
  );
  const [isDirty, setIsDirty] = useState(false);

  const serverBaseline = useMemo(
    () => (isReady ? profileToFormValues(profile) : null),
    [isReady, profile],
  );
  const baseline = isEditing ? editBaseline : serverBaseline;

  const recomputeDirty = useCallback(() => {
    if (!baseline) {
      setIsDirty(false);
      return;
    }
    setIsDirty(
      areSettingsFormValuesDirty(form.getFieldsValue(true), baseline, PROFILE_FIELD_KEYS),
    );
  }, [baseline, form]);

  useEffect(() => {
    if (!isReady || isEditing || !serverBaseline) return;
    form.setFieldsValue(serverBaseline);
  }, [form, isEditing, isReady, serverBaseline]);

  const saveMutation = useMutation({
    mutationFn: (values) =>
      updateCompanyProfile({
        company_name: values.company_name,
        legal_name: emptyToNull(values.legal_name),
        phone: emptyToNull(values.phone),
        email: emptyToNull(values.email),
        website: emptyToNull(values.website),
        tax_number: emptyToNull(values.tax_number),
        registration_number: emptyToNull(values.registration_number),
        address: emptyToNull(values.address),
      }),
    onSuccess: (data) => {
      const hostname =
        typeof window !== "undefined" ? window.location.hostname : "";
      queryClient.setQueryData(companyProfileQueryKey(hostname), data);
      setIsEditing(false);
      setEditBaseline(null);
      setIsDirty(false);
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
    const values = serverBaseline ?? profileToFormValues(profile);
    form.setFieldsValue(values);
    setEditBaseline(values);
    setIsDirty(false);
    setIsEditing(true);
  }, [form, profile, serverBaseline]);

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
          <CompanyProfileLogoSection
            logo={profile.logo}
            profileQueryKey={queryKey}
            t={t}
            tApiErrors={tApiErrors}
            readOnly={!isEditing}
          />
        </div>
        {actions}
      </div>
      <CompanyProfileForm
        form={form}
        t={t}
        disabled={!isEditing}
        onValuesChange={recomputeDirty}
        onFinish={(values) => saveMutation.mutate(values)}
      />
    </div>
  );
}
