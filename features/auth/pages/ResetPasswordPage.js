"use client";

import { centralRequest, tenantRequest } from "@/lib/axios";
import AuthSplitShell from "../components/AuthSplitShell";
import { Link, useRouter } from "@/i18n/navigation";
import {
  getApiErrorCode,
  getLocalizedApiErrorMessage,
} from "@/lib/api-error-notify";
import { resolveHostMode } from "@/lib/runtime-mode";
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  LockOutlined,
  MailOutlined,
} from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { App, Button, Form, Input, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { z } from "zod";

const schema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    password_confirmation: z.string().min(8),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Passwords do not match",
    path: ["password_confirmation"],
  });

function ResetPasswordForm({ initialHost }) {
  const t = useTranslations("ResetPassword");
  const tLogin = useTranslations("Login");
  const tApiErrors = useTranslations("ApiErrors");
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token") || "";
  const emailFromQuery = searchParams.get("email") || "";

  const mode = useMemo(() => resolveHostMode(initialHost), [initialHost]);
  const isCentral = mode.isCentral;
  const tenantLabel = mode.tenantSlug
    ? mode.tenantSlug.charAt(0).toUpperCase() + mode.tenantSlug.slice(1)
    : "Your";

  useEffect(() => {
    if (emailFromQuery) {
      form.setFieldsValue({ email: emailFromQuery });
    }
  }, [emailFromQuery, form]);

  const mutation = useMutation({
    mutationFn: async (payload) => {
      const body = { ...payload, token };
      if (isCentral) {
        return centralRequest("POST", "reset-password", body);
      }
      return tenantRequest("POST", "auth/reset-password", body);
    },
    onSuccess: () => {
      message.success(t("success"));
      router.replace("/login");
    },
    onError: (err) => {
      const msg = getLocalizedApiErrorMessage(tApiErrors, err) || t("error");
      if (getApiErrorCode(err) === "PASSWORD_UNCHANGED") {
        form.setFields([{ name: "password", errors: [msg] }]);
      }
      message.error(msg);
    },
  });

  const onFinish = (values) => {
    if (!token) {
      message.error(t("missingToken"));
      return;
    }

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
    >
      <div className="mb-8 text-center">
        <Typography.Title
          level={3}
          className="!mb-1 !mt-0 !text-2xl !font-bold !leading-snug !tracking-tight !text-[var(--ant-color-text)]"
        >
          {t("title")}
        </Typography.Title>
        <Typography.Paragraph className="!mb-0 !text-sm !text-[var(--ant-color-text-secondary)]">
          {t("subtitle")}
        </Typography.Paragraph>
      </div>

      {!token ? (
        <Typography.Paragraph className="!mb-6 !text-sm !text-amber-700 dark:!text-amber-400">
          {t("missingToken")}
        </Typography.Paragraph>
      ) : null}

      <Form
        className="login-anim-in login-anim-delay-3"
        form={form}
        layout="vertical"
        onFinish={onFinish}
        requiredMark={false}
        size="large"
        initialValues={{ email: emailFromQuery }}
      >
        <Form.Item
          label={tLogin("email")}
          name="email"
          className="!mb-5"
          rules={[{ required: true, type: "email" }]}
        >
          <Input
            id="reset-email"
            autoComplete="email"
            className="login-form-input"
            placeholder={tLogin("emailPlaceholder")}
            prefix={
              <MailOutlined
                className="text-slate-400 dark:text-slate-500"
                aria-hidden
              />
            }
          />
        </Form.Item>
        <Form.Item
          label={t("password")}
          name="password"
          className="!mb-5"
          rules={[{ required: true, min: 8 }]}
        >
          <Input.Password
            id="reset-password"
            autoComplete="new-password"
            className="login-form-input"
            placeholder={tLogin("passwordPlaceholder")}
            prefix={
              <LockOutlined
                className="text-slate-400 dark:text-slate-500"
                aria-hidden
              />
            }
          />
        </Form.Item>
        <Form.Item
          label={t("passwordConfirmation")}
          name="password_confirmation"
          className="!mb-6"
          dependencies={["password"]}
          rules={[
            { required: true, min: 8 },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("password") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error(t("passwordMismatch")));
              },
            }),
          ]}
        >
          <Input.Password
            id="reset-password-confirmation"
            autoComplete="new-password"
            className="login-form-input"
            placeholder={tLogin("passwordPlaceholder")}
            prefix={
              <LockOutlined
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
            disabled={!token}
            block
            size="large"
            className="login-submit-btn"
          >
            {t("submit")}
          </Button>
        </Form.Item>
      </Form>

      <div className="login-anim-in login-anim-delay-5 mt-2">
        <Link
          href="/login"
          className="login-inline-link inline-flex items-center gap-2 text-sm font-medium"
        >
          <ArrowLeftOutlined aria-hidden />
          {t("backToLogin")}
        </Link>
      </div>
    </AuthSplitShell>
  );
}

export default function ResetPasswordClient({ initialHost }) {
  return (
    <App className="flex min-h-dvh flex-col">
      <ResetPasswordForm initialHost={initialHost} />
    </App>
  );
}
