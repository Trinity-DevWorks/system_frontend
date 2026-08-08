"use client";

import CompanyProfileForm from "./CompanyProfileForm";
import CompanyProfileLogoSection from "./CompanyProfileLogoSection";
import {
  companyProfileQueryKey,
  useCompanyProfile,
} from "@/lib/company-profile";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { updateCompanyProfile } from "@/services/companyProfileApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Form, Spin } from "antd";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

function emptyToNull(value) {
  if (value == null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
}

export default function CompanyProfilePage() {
  const t = useTranslations("CompanyProfile");
  const tApiErrors = useTranslations("ApiErrors");
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { profile, isLoading, isError, isReady, queryKey } = useCompanyProfile();

  useEffect(() => {
    if (!isReady) return;
    form.setFieldsValue({
      company_name: profile.company_name,
      legal_name: profile.legal_name,
      phone: profile.phone,
      email: profile.email,
      website: profile.website,
      tax_number: profile.tax_number,
      registration_number: profile.registration_number,
      address: profile.address,
    });
  }, [form, isReady, profile]);

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
      <CompanyProfileLogoSection
        logo={profile.logo}
        profileQueryKey={queryKey}
        t={t}
        tApiErrors={tApiErrors}
      />
      <CompanyProfileForm
        form={form}
        t={t}
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
