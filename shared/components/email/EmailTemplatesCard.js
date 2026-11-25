"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Card, Form, Input, Segmented, Select, Spin, Tag, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
/** Tenant rows carry `document_type`, platform rows `type`. @param {Record<string, any>} row */
const rowType = (row) => row.document_type ?? row.type;

/**
 * Settings → Email → the subject / body of each email, per language. Used by tenant Settings → Email
 * (one text per document type) and central Settings → Email (account emails such as password reset).
 *
 * @param {{
 *   readOnly: boolean;
 *   namespace: string;
 *   queryKey: readonly unknown[];
 *   fetchTemplates: () => Promise<{ templates: Record<string, any>[], placeholders: string[] }>;
 *   saveTemplate: (type: string, locale: string, body: { subject: string, body: string }) => Promise<unknown>;
 *   resetTemplate: (type: string, locale: string) => Promise<unknown>;
 *   types: { value: string, label: string }[];
 * }} props `namespace` holds the texts (same keys as `EmailSettings`).
 */
export default function EmailTemplatesCard({
  readOnly,
  namespace,
  queryKey,
  fetchTemplates,
  saveTemplate,
  resetTemplate,
  types,
}) {
  const t = useTranslations(namespace);
  const tApiErrors = useTranslations("ApiErrors");
  const { notification, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [type, setType] = useState(/** @type {string} */ (types[0]?.value ?? ""));
  const [locale, setLocale] = useState("en");
  /** Last focused field + caret, so a placeholder chip goes where the user was typing. */
  const focus = useRef(/** @type {{ field: "subject" | "body"; start: number; end: number }} */ ({ field: "body", start: -1, end: -1 }));

  const query = useQuery({ queryKey, queryFn: fetchTemplates });
  const current = query.data?.templates.find((row) => rowType(row) === type && row.locale === locale);
  const placeholders = query.data?.placeholders ?? [];

  useEffect(() => {
    if (current) form.setFieldsValue({ subject: current.subject, body: current.body });
  }, [current, form]);

  const onSaved = () => queryClient.invalidateQueries({ queryKey });
  const onError = (error) =>
    notification.error({ title: t("templateSaveError"), description: getLocalizedApiErrorMessage(tApiErrors, error) });

  const save = useMutation({
    mutationFn: (values) => saveTemplate(type, locale, values),
    onSuccess: async () => {
      await onSaved();
      notification.success({ title: t("templateSaved") });
    },
    onError,
  });
  const reset = useMutation({
    mutationFn: () => resetTemplate(type, locale),
    onSuccess: async () => {
      await onSaved();
      notification.success({ title: t("templateReset") });
    },
    onError,
  });

  /** Remembers which field and caret position a placeholder chip should go to. */
  const trackCaret = (event) => {
    const el = event.target;
    const field = el.dataset?.field === "subject" ? "subject" : "body";
    focus.current = { field, start: el.selectionStart ?? -1, end: el.selectionEnd ?? -1 };
  };

  /** @param {string} key */
  const insert = (key) => {
    const { field, start, end } = focus.current;
    const value = String(form.getFieldValue(field) ?? "");
    const token = `{${key}}`;
    const next = start < 0 ? `${value}${token}` : `${value.slice(0, start)}${token}${value.slice(end)}`;
    form.setFieldValue(field, next);
    const caret = (start < 0 ? value.length : start) + token.length;
    focus.current = { field, start: caret, end: caret };
  };

  const confirmReset = () =>
    modal.confirm({
      title: t("resetConfirmTitle"),
      content: t("resetConfirmBody"),
      okText: t("resetTemplate"),
      onOk: () => reset.mutateAsync(),
    });

  return (
    <Card className="max-w-3xl" title={t("templates")}>
      {query.isPending ? (
        <div className="flex min-h-32 items-center justify-center">
          <Spin />
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {types.length > 1 ? (
              <Select
                className="min-w-64"
                value={type}
                onChange={setType}
                showSearch
                optionFilterProp="label"
                options={types}
              />
            ) : (
              <Typography.Text strong>{types[0]?.label}</Typography.Text>
            )}
            <Segmented
              value={locale}
              onChange={(value) => setLocale(String(value))}
              options={[
                { value: "en", label: t("language_en") },
                { value: "ar", label: t("language_ar") },
              ]}
            />
            {current?.custom ? <Tag color="blue">{t("customized")}</Tag> : <Tag>{t("default")}</Tag>}
          </div>

          <Form
            form={form}
            layout="vertical"
            disabled={readOnly}
            onFinish={(values) => save.mutate(values)}
          >
            <Form.Item name="subject" label={t("subject")} rules={[{ required: true, message: t("required") }]}>
              <Input
                dir={locale === "ar" ? "rtl" : "ltr"}
                maxLength={255}
                data-field="subject"
                onSelect={trackCaret}
                onKeyUp={trackCaret}
              />
            </Form.Item>
            <Form.Item
              name="body"
              label={t("body")}
              tooltip={t("bodyHelp")}
              rules={[{ required: true, message: t("required") }]}
            >
              <Input.TextArea
                dir={locale === "ar" ? "rtl" : "ltr"}
                autoSize={{ minRows: 8, maxRows: 18 }}
                maxLength={10000}
                data-field="body"
                onSelect={trackCaret}
                onKeyUp={trackCaret}
              />
            </Form.Item>
            {readOnly ? null : (
              <div className="mb-4 flex flex-wrap items-center gap-1">
                <Typography.Text type="secondary" className="me-1 text-xs">
                  {t("insertPlaceholder")}
                </Typography.Text>
                {placeholders.map((key) => (
                  <Tag key={key} className="cursor-pointer" onClick={() => insert(key)}>
                    {`{${key}}`}
                  </Tag>
                ))}
              </div>
            )}
            {readOnly ? null : (
              <div className="flex flex-wrap gap-2">
                <Button type="primary" htmlType="submit" loading={save.isPending} disabled={reset.isPending}>
                  {t("saveTemplate")}
                </Button>
                {current?.custom ? (
                  <Button onClick={confirmReset} loading={reset.isPending} disabled={save.isPending}>
                    {t("resetTemplate")}
                  </Button>
                ) : null}
              </div>
            )}
          </Form>
        </>
      )}
    </Card>
  );
}
