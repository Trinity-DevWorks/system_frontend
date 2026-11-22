"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useResourceAccess } from "@/lib/permissions";
import { formatTenantDateTime } from "@/lib/tenant-format";
import ResourceDrawerFieldLabel from "@/shared/components/resource-drawer/ResourceDrawerFieldLabel";
import { CheckCircleFilled, ExclamationCircleFilled } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Card, Form, Input, InputNumber, Select, Spin, Switch, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import {
  EMAIL_SETTINGS_QUERY_KEY,
  fetchEmailSettings,
  sendTestEmail,
  updateEmailSettings,
} from "../api/documentEmail.api";
import EmailTemplatesCard from "../components/EmailTemplatesCard";

/** Common mailboxes: picking one fills the server fields. */
const PROVIDERS = {
  gmail: { host: "smtp.gmail.com", port: 587, encryption: "tls" },
  outlook: { host: "smtp.office365.com", port: 587, encryption: "tls" },
  zoho: { host: "smtp.zoho.com", port: 465, encryption: "ssl" },
};

/** @param {string | null | undefined} host */
function providerOf(host) {
  const match = Object.entries(PROVIDERS).find(([, p]) => p.host === host);
  return match ? match[0] : "custom";
}

/**
 * Label with a `?` help and the switch on the right (same as the recurring template drawer).
 * @param {{ name: string; title: string; help: string }} props
 */
function SwitchRow({ name, title, help }) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4 rounded-md border border-solid border-[var(--ant-color-border-secondary)] px-4 py-3">
      <div className="min-w-0 font-medium">
        <ResourceDrawerFieldLabel text={title} help={help} />
      </div>
      <Form.Item name={name} valuePropName="checked" noStyle>
        <Switch />
      </Form.Item>
    </div>
  );
}

export default function EmailSettingsPage() {
  const t = useTranslations("EmailSettings");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification } = App.useApp();
  const access = useResourceAccess("email_settings");
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const readOnly = !access.canEdit;

  const query = useQuery({ queryKey: EMAIL_SETTINGS_QUERY_KEY, queryFn: fetchEmailSettings });
  const settings = query.data;

  useEffect(() => {
    if (!settings) return;
    form.setFieldsValue({
      ...settings,
      // A mailbox being set up for the first time is meant to be used: start with sending on.
      enabled: settings.host ? settings.enabled : true,
      password: "",
      provider: providerOf(settings.host),
    });
  }, [settings, form]);

  const toPayload = (values) => {
    const { provider: _provider, ...rest } = values;
    return { ...rest, password: rest.password || null };
  };

  const save = useMutation({
    mutationFn: (values) => updateEmailSettings(toPayload(values)),
    onSuccess: (data) => {
      queryClient.setQueryData(EMAIL_SETTINGS_QUERY_KEY, data);
      notification.success({ title: t("saved") });
    },
    onError: (error) =>
      notification.error({ title: t("saveError"), description: getLocalizedApiErrorMessage(tApiErrors, error) }),
  });

  // Saves first (the test uses the saved settings), then sends the test email.
  const test = useMutation({
    mutationFn: async () => {
      const values = await form.validateFields();
      await updateEmailSettings(toPayload(values));
      return sendTestEmail();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(EMAIL_SETTINGS_QUERY_KEY, data);
      if (data?.enabled) {
        notification.success({ title: t("testSent"), description: t("testSentHint") });
      } else {
        // The mailbox works, but documents can't be emailed until "Send emails" is on.
        notification.warning({ title: t("testSent"), description: t("testSentButDisabled"), duration: 0 });
      }
    },
    onError: (error) => {
      if (error && typeof error === "object" && "errorFields" in error) return;
      queryClient.invalidateQueries({ queryKey: EMAIL_SETTINGS_QUERY_KEY });
      notification.error({
        title: t("testFailed"),
        description: getLocalizedApiErrorMessage(tApiErrors, error),
        duration: 0,
      });
    },
  });

  const onProvider = (value) => {
    const preset = PROVIDERS[value];
    if (preset) form.setFieldsValue(preset);
  };

  const enabled = Form.useWatch("enabled", form);
  const provider = Form.useWatch("provider", form);
  const busy = save.isPending || test.isPending;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-auto p-4">
      <Typography.Title level={4} className="!mb-0">
        {t("title")}
      </Typography.Title>
      <Typography.Text type="secondary">{t("subtitle")}</Typography.Text>
      {query.isError ? (
        <Alert type="error" showIcon title={getLocalizedApiErrorMessage(tApiErrors, query.error)} />
      ) : null}
      {query.isPending ? (
        <div className="flex min-h-40 items-center justify-center">
          <Spin />
        </div>
      ) : (
        <>
          <Card
            className="max-w-3xl"
            title={t("connection")}
            extra={
              settings?.verified_at ? (
                <Typography.Text type="success" className="text-xs">
                  <CheckCircleFilled /> {t("verifiedAt", { date: formatTenantDateTime(settings.verified_at) })}
                </Typography.Text>
              ) : (
                <Typography.Text type="warning" className="text-xs">
                  <ExclamationCircleFilled /> {t("notVerified")}
                </Typography.Text>
              )
            }
          >
            <Form
              form={form}
              layout="vertical"
              disabled={readOnly}
              onFinish={(values) => save.mutate(values)}
              initialValues={{ enabled: false, port: 587, encryption: "tls", bcc_sender: false, provider: "custom" }}
            >
              <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                <SwitchRow name="enabled" title={t("enabled")} help={t("enabledHelp")} />
                <SwitchRow name="bcc_sender" title={t("bccSender")} help={t("bccSenderHelp")} />
              </div>

              <Form.Item name="provider" label={t("provider")} tooltip={t("providerHelp")}>
                <Select
                  className="!w-64"
                  onChange={onProvider}
                  options={["gmail", "outlook", "zoho", "custom"].map((value) => ({
                    value,
                    label: t(`provider_${value}`),
                  }))}
                />
              </Form.Item>
              {provider === "gmail" ? (
                <Alert className="!mb-4" type="info" showIcon title={t("gmailHint")} />
              ) : null}

              <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-[1fr_120px_140px]">
                <Form.Item
                  name="host"
                  label={t("host")}
                  tooltip={t("hostHelp")}
                  rules={[{ required: enabled, message: t("required") }]}
                >
                  <Input placeholder="smtp.example.com" autoComplete="off" />
                </Form.Item>
                <Form.Item name="port" label={t("port")} rules={[{ required: true, message: t("required") }]}>
                  <InputNumber className="!w-full" min={1} max={65535} controls={false} />
                </Form.Item>
                <Form.Item name="encryption" label={t("encryption")} tooltip={t("encryptionHelp")}>
                  <Select
                    options={["tls", "ssl", "none"].map((value) => ({ value, label: t(`encryption_${value}`) }))}
                  />
                </Form.Item>
              </div>

              <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                <Form.Item name="username" label={t("username")} tooltip={t("usernameHelp")}>
                  <Input autoComplete="off" />
                </Form.Item>
                <Form.Item name="password" label={t("password")} tooltip={t("passwordHelp")}>
                  <Input.Password
                    autoComplete="new-password"
                    placeholder={settings?.has_password ? t("passwordSaved") : ""}
                  />
                </Form.Item>
              </div>

              <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                <Form.Item
                  name="from_address"
                  label={t("fromAddress")}
                  tooltip={t("fromAddressHelp")}
                  rules={[
                    { required: enabled, message: t("required") },
                    { type: "email", message: t("invalidEmail") },
                  ]}
                >
                  <Input placeholder="billing@yourcompany.com" />
                </Form.Item>
                <Form.Item name="from_name" label={t("fromName")} tooltip={t("fromNameHelp")}>
                  <Input />
                </Form.Item>
                <Form.Item
                  name="reply_to"
                  label={t("replyTo")}
                  tooltip={t("replyToHelp")}
                  rules={[{ type: "email", message: t("invalidEmail") }]}
                >
                  <Input />
                </Form.Item>
              </div>

              {readOnly ? null : (
                <div className="flex flex-wrap gap-2">
                  <Button type="primary" htmlType="submit" loading={save.isPending} disabled={busy}>
                    {t("save")}
                  </Button>
                  <Button onClick={() => test.mutate()} loading={test.isPending} disabled={busy}>
                    {t("sendTest")}
                  </Button>
                </div>
              )}
            </Form>
          </Card>

          <EmailTemplatesCard readOnly={readOnly} />
        </>
      )}
    </div>
  );
}
