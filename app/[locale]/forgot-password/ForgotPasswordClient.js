"use client";

import centralApiService from "@/API/CentralApiService";
import tenantApiService from "@/API/TenantApiService";
import AuthSplitShell from "@/components/auth/AuthSplitShell";
import { Link } from "@/i18n/navigation";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { resolveHostMode } from "@/lib/runtime-mode";
import { ArrowLeftOutlined, ArrowRightOutlined, MailOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { App, Button, Form, Input, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
});

function ForgotPasswordForm({ initialHost }) {
  const t = useTranslations("ForgotPassword");
  const tLogin = useTranslations("Login");
  const tApiErrors = useTranslations("ApiErrors");
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const mode = useMemo(() => resolveHostMode(initialHost), [initialHost]);
  const isCentral = mode.isCentral;
  const tenantLabel = mode.tenantSlug
    ? mode.tenantSlug.charAt(0).toUpperCase() + mode.tenantSlug.slice(1)
    : "Your";

  const mutation = useMutation({
    mutationFn: async ({ email }) => {
      if (isCentral) {
        return centralApiService("POST", "forgot-password", { email });
      }
      return tenantApiService("POST", "auth/forgot-password", { email });
    },
    onSuccess: () => {
      message.success(t("success"));
      form.resetFields();
    },
    onError: (err) => {
      message.error(getLocalizedApiErrorMessage(tApiErrors, err) || t("error"));
    },
  });

  const onFinish = (values) => {
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      form.setFields(
        parsed.error.issues.map((issue) => ({
          name: issue.path,
          errors: [issue.message],
        })),
      );
      return;
    }
    mutation.mutate(parsed.data);
  };

  return (
    <AuthSplitShell
      isCentral={isCentral}
      tenantLabel={tenantLabel}
      leadText={t("lead")}
    >
      <Typography.Title
        level={3}
        className="login-anim-in login-anim-delay-2 !mb-2 !mt-0 !text-[1.35rem] !font-semibold !leading-snug !tracking-tight !text-slate-900 dark:!text-white sm:!text-[1.65rem]"
      >
        {t("title")}
      </Typography.Title>
      <Typography.Paragraph className="login-anim-in login-anim-delay-2 !mb-8 !text-sm !text-slate-500 dark:!text-slate-400">
        {t("subtitle")}
      </Typography.Paragraph>

      <Form
        className="login-anim-in login-anim-delay-3"
        form={form}
        layout="vertical"
        onFinish={onFinish}
        requiredMark={false}
        size="large"
      >
        <Form.Item
          label={
            <span className="text-sm font-semibold tracking-wide text-slate-800 dark:text-slate-100">
              {tLogin("email")}
            </span>
          }
          name="email"
          className="!mb-6"
          rules={[{ required: true, type: "email" }]}
        >
          <Input
            id="forgot-email"
            autoComplete="email"
            className="login-form-input !rounded-lg !shadow-none"
            placeholder={tLogin("emailPlaceholder")}
            prefix={
              <MailOutlined
                className="text-slate-400 dark:text-slate-500"
                aria-hidden
              />
            }
          />
        </Form.Item>
        <Form.Item className="!mb-4">
          <Button
            type="primary"
            htmlType="submit"
            icon={<ArrowRightOutlined />}
            iconPlacement="end"
            loading={mutation.isPending}
            block
            size="large"
            className="!h-12 !rounded-xl !text-[15px] !font-semibold !shadow-md !shadow-emerald-900/25 !transition-transform active:!scale-[0.99] motion-reduce:!transform-none"
          >
            {t("submit")}
          </Button>
        </Form.Item>
      </Form>

      <div className="login-anim-in login-anim-delay-5 mt-2">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
        >
          <ArrowLeftOutlined aria-hidden />
          {t("backToLogin")}
        </Link>
      </div>
    </AuthSplitShell>
  );
}

export default function ForgotPasswordClient({ initialHost }) {
  return (
    <App className="flex min-h-dvh flex-col">
      <ForgotPasswordForm initialHost={initialHost} />
    </App>
  );
}
