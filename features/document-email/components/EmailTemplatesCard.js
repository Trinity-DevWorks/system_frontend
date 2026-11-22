"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Card, Form, Input, Segmented, Select, Spin, Tag, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  DOCUMENT_EMAIL_TYPES,
  EMAIL_TEMPLATES_QUERY_KEY,
  fetchEmailTemplates,
  resetEmailTemplate,
  saveEmailTemplate,
} from "../api/documentEmail.api";

/**
 * Settings → Email → the subject / body each document is sent with, per language.
 * @param {{ readOnly: boolean }} props
 */
export default function EmailTemplatesCard({ readOnly }) {
  const t = useTranslations("EmailSettings");
  const tDoc = useTranslations("DocumentEmail");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [type, setType] = useState(/** @type {string} */ (DOCUMENT_EMAIL_TYPES[0]));
  const [locale, setLocale] = useState("en");
  /** Last focused field + caret, so a placeholder chip goes where the user was typing. */
  const focus = useRef(/** @type {{ field: "subject" | "body"; start: number; end: number }} */ ({ field: "body", start: -1, end: -1 }));

  const query = useQuery({ queryKey: EMAIL_TEMPLATES_QUERY_KEY, queryFn: fetchEmailTemplates });
  const current = query.data?.templates.find((row) => row.document_type === type && row.locale === locale);
  const placeholders = query.data?.placeholders ?? [];

  useEffect(() => {
    if (current) form.setFieldsValue({ subject: current.subject, body: current.body });
  }, [current, form]);

  const onSaved = () => queryClient.invalidateQueries({ queryKey: EMAIL_TEMPLATES_QUERY_KEY });
  const onError = (error) =>
    notification.error({ title: t("templateSaveError"), description: getLocalizedApiErrorMessage(tApiErrors, error) });

  const save = useMutation({
    mutationFn: (values) => saveEmailTemplate(type, locale, values),
    onSuccess: async () => {
      await onSaved();
      notification.success({ title: t("templateSaved") });
    },
    onError,
  });
  const reset = useMutation({
    mutationFn: () => resetEmailTemplate(type, locale),
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
            <Select
              className="min-w-64"
              value={type}
              onChange={setType}
              showSearch
              optionFilterProp="label"
              options={DOCUMENT_EMAIL_TYPES.map((value) => ({ value, label: tDoc(`type_${value}`) }))}
            />
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
