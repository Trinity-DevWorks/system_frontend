"use client";

import { getApiErrorCode } from "@/lib/api-error-notify";
import { Alert, Form, Input, Modal } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";

/** Backend codes handled by the approval popup (not shown as a toast). */
export const DISCOUNT_APPROVAL_CODES = ["DISCOUNT_APPROVAL_REQUIRED", "DISCOUNT_APPROVAL_INVALID", "DISCOUNT_APPROVAL_THROTTLED"];

/** @param {unknown} err */
export function isDiscountApprovalError(err) {
  return DISCOUNT_APPROVAL_CODES.includes(getApiErrorCode(err) ?? "");
}

/**
 * Discount above the user's limit: the post/confirm call fails with DISCOUNT_APPROVAL_REQUIRED,
 * a manager types their login here, and the call is sent again with `discount_approval`.
 *
 * @returns {{
 *   withApproval: (run: (approval: { email: string; password: string } | null) => Promise<unknown>) => Promise<unknown>;
 *   approvalModal: import("react").ReactNode;
 * }}
 */
export function useDiscountApproval() {
  const t = useTranslations("DiscountApproval");
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  /** @type {import("react").MutableRefObject<{ run: (a: { email: string; password: string }) => Promise<unknown>; resolve: (v: unknown) => void } | null>} */
  const pending = useRef(null);

  const withApproval = useCallback(
    (run) =>
      run(null).catch((err) => {
        if (getApiErrorCode(err) !== "DISCOUNT_APPROVAL_REQUIRED") throw err;
        return new Promise((resolve) => {
          pending.current = { run, resolve };
          form.resetFields();
          setError(null);
          setOpen(true);
        });
      }),
    [form],
  );

  const close = (value) => {
    pending.current?.resolve(value);
    pending.current = null;
    setOpen(false);
    form.resetFields();
  };

  const submit = async () => {
    const values = await form.validateFields();
    if (!pending.current) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await pending.current.run({ email: String(values.email).trim(), password: String(values.password) });
      close(result);
    } catch (err) {
      const code = getApiErrorCode(err);
      setError(code === "DISCOUNT_APPROVAL_THROTTLED" ? t("throttled") : code === "DISCOUNT_APPROVAL_INVALID" ? t("invalid") : t("failed"));
      if (!isDiscountApprovalError(err)) close(undefined);
    } finally {
      setSubmitting(false);
    }
  };

  const approvalModal = (
    <Modal
      open={open}
      title={t("title")}
      okText={t("approve")}
      cancelText={t("cancel")}
      confirmLoading={submitting}
      onOk={submit}
      onCancel={() => close(undefined)}
      destroyOnHidden
    >
      <Alert type="warning" showIcon className="mb-4" title={t("explain")} />
      {error ? <Alert type="error" showIcon className="mb-4" title={error} /> : null}
      <Form form={form} layout="vertical" requiredMark={false} onFinish={submit}>
        <Form.Item name="email" label={t("email")} rules={[{ required: true, message: t("emailRequired") }]}>
          <Input autoComplete="off" autoFocus />
        </Form.Item>
        <Form.Item name="password" label={t("password")} rules={[{ required: true, message: t("passwordRequired") }]}>
          <Input.Password autoComplete="new-password" onPressEnter={submit} />
        </Form.Item>
      </Form>
    </Modal>
  );

  return { withApproval, approvalModal };
}
