"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useResourceAccess } from "@/lib/permissions";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Card, Form, Input, Select, Spin, Switch, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { PRINT_SETTINGS_QUERY_KEY, fetchPrintSettings, updatePrintSettings } from "../api/printSettings.api";

const SWITCHES = ["show_logo", "show_tax_number", "show_address", "show_signatures"];

export default function PrintSettingsPage() {
  const t = useTranslations("PrintSettings");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification } = App.useApp();
  const access = useResourceAccess("print_settings");
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const query = useQuery({ queryKey: PRINT_SETTINGS_QUERY_KEY, queryFn: fetchPrintSettings });

  useEffect(() => {
    if (query.data) form.setFieldsValue(query.data);
  }, [query.data, form]);

  const mutation = useMutation({
    mutationFn: updatePrintSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(PRINT_SETTINGS_QUERY_KEY, data);
      notification.success({ title: t("saved") });
    },
    onError: (error) => notification.error({ title: t("saveError"), description: getLocalizedApiErrorMessage(tApiErrors, error) }),
  });

  const readOnly = !access.canEdit;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 p-4">
      <Typography.Title level={4} className="!mb-0">
        {t("title")}
      </Typography.Title>
      <Typography.Text type="secondary">{t("subtitle")}</Typography.Text>
      {query.isError ? <Alert type="error" showIcon title={getLocalizedApiErrorMessage(tApiErrors, query.error)} /> : null}
      {query.isPending ? (
        <div className="flex min-h-40 items-center justify-center">
          <Spin />
        </div>
      ) : (
        <Card className="max-w-2xl">
          <Form form={form} layout="vertical" disabled={readOnly} onFinish={(values) => mutation.mutate(values)}>
            <Form.Item name="paper" label={t("paper")} rules={[{ required: true }]} extra={t("paperHint")}>
              <Select
                className="!w-48"
                options={["a4", "a5", "letter"].map((value) => ({ value, label: t(`paper_${value}`) }))}
              />
            </Form.Item>
            <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
              {SWITCHES.map((name) => (
                <Form.Item key={name} name={name} label={t(name)} valuePropName="checked">
                  <Switch />
                </Form.Item>
              ))}
            </div>
            <Form.Item name="footer_text" label={t("footer_text")} extra={t("footerHint")}>
              <Input maxLength={500} showCount />
            </Form.Item>
            <Form.Item name="terms_text" label={t("terms_text")} extra={t("termsHint")}>
              <Input.TextArea rows={4} maxLength={5000} />
            </Form.Item>
            {readOnly ? null : (
              <Button type="primary" htmlType="submit" loading={mutation.isPending}>
                {t("save")}
              </Button>
            )}
          </Form>
        </Card>
      )}
    </div>
  );
}
