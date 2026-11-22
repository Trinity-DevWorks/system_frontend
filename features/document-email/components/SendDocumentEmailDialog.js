"use client";

import { Link } from "@/i18n/navigation";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { formatTenantDateTime } from "@/lib/tenant-format";
import { PaperClipOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  App,
  Button,
  Collapse,
  Form,
  Input,
  Modal,
  Segmented,
  Select,
  Spin,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  documentEmailsQueryKey,
  fetchDocumentEmailDefaults,
  sendDocumentEmail,
} from "../api/documentEmail.api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** @type {Record<string, string>} */
const STATUS_COLORS = { sent: "success", failed: "error", queued: "processing", sending: "processing" };

/**
 * @typedef {{
 *   type: import("../api/documentEmail.api").DocumentEmailType;
 *   id: string;
 *   number?: string | null;
 *   statement?: { date_from?: string | null; date_to?: string | null; currency_id?: number | null } | null;
 * }} EmailTarget
 */

/**
 * "Send by email" for any document: recipients, language, subject, body and the PDF,
 * plus the earlier sends of the same document. Opened from drawers and list row menus.
 *
 * @param {{ target: EmailTarget | null; onClose: () => void; onQueued?: (target: EmailTarget) => void }} props
 */
export default function SendDocumentEmailDialog({ target, onClose, onQueued }) {
  const t = useTranslations("DocumentEmail");
  const tApiErrors = useTranslations("ApiErrors");
  const uiLocale = useLocale();
  const { notification } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [locale, setLocale] = useState(uiLocale === "ar" ? "ar" : "en");
  const open = target != null;

  const params = target
    ? {
        type: target.type,
        id: target.id,
        locale,
        date_from: target.statement?.date_from ?? null,
        date_to: target.statement?.date_to ?? null,
        currency_id: target.statement?.currency_id ?? null,
      }
    : null;

  const defaults = useQuery({
    queryKey: ["tenant", "document-email-defaults", params],
    queryFn: () => fetchDocumentEmailDefaults(/** @type {any} */ (params)),
    enabled: open,
    staleTime: 0,
  });
  const data = defaults.data;

  // Fill the form whenever fresh defaults arrive (opening, or switching language).
  useEffect(() => {
    if (!open || !data) return;
    const current = form.getFieldsValue(["to", "cc"]);
    form.setFieldsValue({
      to: current.to?.length ? current.to : data.to ?? [],
      cc: current.cc ?? [],
      subject: data.subject,
      body: data.body,
    });
  }, [open, data, form]);

  const close = () => {
    form.resetFields();
    setLocale(uiLocale === "ar" ? "ar" : "en");
    onClose();
  };

  const send = useMutation({
    mutationFn: (values) =>
      sendDocumentEmail({
        type: target?.type,
        id: target?.id,
        locale,
        to: values.to,
        cc: values.cc ?? [],
        subject: values.subject,
        body: values.body,
        ...(target?.statement ?? {}),
      }),
    onSuccess: () => {
      notification.success({ title: t("queued"), description: t("queuedHint") });
      if (target) {
        queryClient.invalidateQueries({ queryKey: documentEmailsQueryKey(target.type, target.id) });
        onQueued?.(target);
      }
      close();
    },
    onError: (error) =>
      notification.error({ title: t("sendError"), description: getLocalizedApiErrorMessage(tApiErrors, error) }),
  });

  const emailRule = {
    validator: (_, value) => {
      const bad = (value ?? []).filter((v) => !EMAIL_RE.test(String(v).trim()));
      return bad.length ? Promise.reject(new Error(t("invalidEmails", { emails: bad.join(", ") }))) : Promise.resolve();
    },
  };

  const suggestionOptions = (data?.suggestions ?? []).map((s) => ({
    value: s.email,
    label: s.label ? `${s.label} <${s.email}>` : s.email,
  }));

  /** @param {Record<string, any>} previous */
  const reuse = (previous) =>
    form.setFieldsValue({ to: previous.to, cc: previous.cc ?? [], subject: previous.subject, body: previous.body });

  const history = Array.isArray(data?.history) ? data.history : [];
  const blocked = data != null && (!data.configured || !data.sendable);
  const docLabel = target ? t(`type_${target.type}`) : "";
  const number = data?.document_number ?? target?.number ?? "";

  return (
    <Modal
      open={open}
      width={720}
      title={t("dialogTitle", { document: number ? `${docLabel} ${number}` : docLabel })}
      okText={t("send")}
      cancelText={t("cancel")}
      okButtonProps={{ loading: send.isPending, disabled: blocked || defaults.isPending }}
      onOk={() => form.validateFields().then((values) => send.mutate(values)).catch(() => {})}
      onCancel={close}
      destroyOnHidden
      // Fits the window: Send stays visible; on a short screen only the form scrolls, not the page.
      centered
      styles={{
        body: {
          maxHeight: "calc(100dvh - 190px)",
          overflowY: "auto",
          overflowX: "hidden",
          paddingInlineEnd: 4,
        },
      }}
    >
      {defaults.isError ? (
        <Alert type="error" showIcon title={getLocalizedApiErrorMessage(tApiErrors, defaults.error)} />
      ) : null}
      {data && !data.configured ? (
        <Alert
          className="!mb-4"
          type="warning"
          showIcon
          title={data.email_status === "disabled" ? t("sendingDisabled") : t("notConfigured")}
          description={<Link href="/main/settings/email">{t("openSettings")}</Link>}
        />
      ) : null}
      {data && data.configured && !data.sendable ? (
        <Alert className="!mb-4" type="warning" showIcon title={t("notSendable")} />
      ) : null}

      <Spin spinning={defaults.isFetching}>
        <Form form={form} layout="vertical" disabled={blocked} requiredMark={false}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <Typography.Text type="secondary" className="text-sm">
              {data?.party_name ?? ""}
            </Typography.Text>
            <Segmented
              size="small"
              value={locale}
              onChange={(value) => setLocale(String(value))}
              options={[
                { value: "en", label: t("language_en") },
                { value: "ar", label: t("language_ar") },
              ]}
            />
          </div>
          <Form.Item
            name="to"
            label={t("to")}
            tooltip={t("toHelp")}
            rules={[{ required: true, message: t("toRequired") }, emailRule]}
          >
            <Select
              mode="tags"
              tokenSeparators={[",", ";", " "]}
              options={suggestionOptions}
              placeholder={t("toPlaceholder")}
              notFoundContent={null}
            />
          </Form.Item>
          <Form.Item name="cc" label={t("cc")} rules={[emailRule]}>
            <Select mode="tags" tokenSeparators={[",", ";", " "]} options={suggestionOptions} notFoundContent={null} />
          </Form.Item>
          <Form.Item name="subject" label={t("subject")} rules={[{ required: true, message: t("subjectRequired") }]}>
            <Input dir={locale === "ar" ? "rtl" : "ltr"} maxLength={255} />
          </Form.Item>
          <Form.Item name="body" label={t("body")} rules={[{ required: true, message: t("bodyRequired") }]}>
            <Input.TextArea dir={locale === "ar" ? "rtl" : "ltr"} autoSize={{ minRows: 5, maxRows: 10 }} maxLength={10000} />
          </Form.Item>
        </Form>

        {data?.attachment_name ? (
          <div className="flex items-center gap-2 rounded-md border border-solid border-[var(--ant-color-border-secondary)] px-3 py-2 text-sm">
            <PaperClipOutlined />
            <span className="truncate">{data.attachment_name}</span>
          </div>
        ) : null}

        {history.length > 0 ? (
          <Collapse
            className="!mt-4"
            size="small"
            items={[
              {
                key: "history",
                label: t("previouslySent", { count: history.length }),
                children: (
                  <div className="flex flex-col divide-y divide-[var(--ant-color-border-secondary)]">
                    {history.map((row) => (
                      <div key={row.id} className="flex items-center gap-3 py-2 text-sm">
                        {row.status === "failed" && row.error ? (
                          <Tooltip title={row.error}>
                            <Tag color={STATUS_COLORS[row.status]}>{t(`status_${row.status}`)}</Tag>
                          </Tooltip>
                        ) : (
                          <Tag color={STATUS_COLORS[row.status]}>{t(`status_${row.status}`)}</Tag>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate">{(row.to ?? []).join(", ")}</div>
                          <Typography.Text type="secondary" className="text-xs">
                            {formatTenantDateTime(row.sent_at ?? row.created_at)}
                            {row.user?.name ? ` · ${row.user.name}` : ""}
                          </Typography.Text>
                        </div>
                        {blocked ? null : (
                          <Button size="small" type="link" onClick={() => reuse(row)}>
                            {t("useAgain")}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ),
              },
            ]}
          />
        ) : null}
      </Spin>
    </Modal>
  );
}
