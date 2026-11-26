"use client";

import { AUTH_ME_QUERY_KEY } from "@/lib/auth-me";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { tenantRequest } from "@/lib/axios";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Button, Card, Form, Input, Modal, Space, Tag, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useState } from "react";

/**
 * The user's own approval PIN: what they type to approve something at the counter (a discount above a
 * cashier's limit, a sale over a customer's credit limit). Only useful when their role may approve.
 *
 * @param {{ hasPin: boolean }} props
 */
export default function ApprovalPinCard({ hasPin }) {
  const t = useTranslations("Profile");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, notification } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [mode, setMode] = useState(/** @type {null | "set" | "remove"} */ (null));

  const mutation = useMutation({
    mutationFn: (/** @type {{ pin: string | null; current_password: string }} */ body) => tenantRequest("PUT", "auth/me/approval-pin", body),
    onSuccess: () => {
      message.success(mode === "remove" ? t("pinRemoved") : t("pinSaved"));
      queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY });
      setMode(null);
      form.resetFields();
    },
    onError: (err) => {
      if (!applyApiFieldErrors(form, err)) {
        notification.error({ title: t("pinError"), description: getLocalizedApiErrorMessage(tApiErrors, err) });
      }
    },
  });

  const submit = async () => {
    // Field errors are shown under the fields.
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    mutation.mutate({ pin: mode === "remove" ? null : String(values.pin), current_password: String(values.current_password) });
  };

  return (
    <Card title={t("pinTitle")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Typography.Paragraph type="secondary" className="!mb-1">
            {t("pinHelp")}
          </Typography.Paragraph>
          <Tag color={hasPin ? "green" : "default"} className="!m-0">
            {hasPin ? t("pinIsSet") : t("pinNotSet")}
          </Tag>
        </div>
        <Space wrap>
          {hasPin ? (
            <Button danger onClick={() => setMode("remove")}>
              {t("pinRemove")}
            </Button>
          ) : null}
          <Button type="primary" onClick={() => setMode("set")}>
            {hasPin ? t("pinChange") : t("pinSet")}
          </Button>
        </Space>
      </div>

      <Modal
        open={mode != null}
        title={mode === "remove" ? t("pinRemove") : hasPin ? t("pinChange") : t("pinSet")}
        okText={mode === "remove" ? t("pinRemove") : t("save")}
        okButtonProps={mode === "remove" ? { danger: true } : undefined}
        cancelText={t("cancel")}
        confirmLoading={mutation.isPending}
        onOk={submit}
        onCancel={() => {
          setMode(null);
          form.resetFields();
        }}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" requiredMark={false} onFinish={submit}>
          <Form.Item name="current_password" label={t("fieldCurrentPassword")} rules={[{ required: true, message: t("pinPasswordRequired") }]}>
            <Input.Password autoComplete="current-password" autoFocus />
          </Form.Item>
          {mode === "set" ? (
            <>
              <Form.Item
                name="pin"
                label={t("pinNew")}
                extra={t("pinFormat")}
                rules={[
                  { required: true, message: t("pinRequired") },
                  { pattern: /^[0-9]{4,6}$/, message: t("pinFormat") },
                ]}
              >
                <Input.Password inputMode="numeric" maxLength={6} autoComplete="new-password" />
              </Form.Item>
              <Form.Item
                name="pin_confirmation"
                label={t("pinConfirm")}
                dependencies={["pin"]}
                rules={[
                  { required: true, message: t("pinRequired") },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      return value === getFieldValue("pin") ? Promise.resolve() : Promise.reject(new Error(t("pinMismatch")));
                    },
                  }),
                ]}
              >
                <Input.Password inputMode="numeric" maxLength={6} autoComplete="new-password" onPressEnter={submit} />
              </Form.Item>
            </>
          ) : null}
        </Form>
      </Modal>
    </Card>
  );
}
