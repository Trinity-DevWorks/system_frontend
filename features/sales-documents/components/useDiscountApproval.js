"use client";

import { getActiveBranchId } from "@/lib/active-branch";
import { getApiErrorCode } from "@/lib/api-error-notify";
import { tenantRequest } from "@/lib/axios";
import { Alert, Form, Input, Modal, Select } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";

/** Backend "needs a manager's OK" codes → the permission that can approve them. */
const REQUIRED = {
  DISCOUNT_APPROVAL_REQUIRED: "discount_override",
  CUSTOMER_CREDIT_LIMIT_EXCEEDED: "credit_limit_override",
};

/** Backend codes handled by the approval popup (not shown as a toast). */
export const DISCOUNT_APPROVAL_CODES = [...Object.keys(REQUIRED), "MANAGER_APPROVAL_INVALID", "MANAGER_APPROVAL_THROTTLED"];

/** @param {unknown} err */
export function isDiscountApprovalError(err) {
  return DISCOUNT_APPROVAL_CODES.includes(getApiErrorCode(err) ?? "");
}

/**
 * Manager approval with a PIN. When post/confirm fails because a manager must approve (discount above the
 * user's limit, customer over the credit limit), this window opens: someone allowed to approve picks their
 * name and types their PIN, and the call is sent again with `approval: { approver_id, pin }`.
 *
 * @returns {{
 *   withApproval: (run: (approval: { approver_id: string; pin: string } | null) => Promise<unknown>) => Promise<unknown>;
 *   approvalModal: import("react").ReactNode;
 * }}
 */
export function useDiscountApproval() {
  const t = useTranslations("DiscountApproval");
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState(/** @type {string} */ ("discount_override"));
  const [approvers, setApprovers] = useState(/** @type {Array<{ id: string; name: string }> | null} */ (null));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  /** @type {import("react").MutableRefObject<{ run: (a: { approver_id: string; pin: string }) => Promise<unknown>; resolve: (v: unknown) => void } | null>} */
  const pending = useRef(null);

  const ask = useCallback(
    (nextAction, run, resolve) => {
      pending.current = { run, resolve };
      setAction(nextAction);
      setApprovers(null);
      form.resetFields();
      setError(null);
      setOpen(true);
      const branchId = getActiveBranchId();
      const qs = new URLSearchParams({ action: nextAction });
      if (branchId != null) qs.set("branch_id", String(branchId));
      tenantRequest("GET", `auth/manager-approvers?${qs.toString()}`)
        .then((rows) => {
          const list = Array.isArray(rows) ? rows : [];
          setApprovers(list);
          if (list.length === 1) form.setFieldsValue({ approver_id: list[0].id });
        })
        .catch(() => setApprovers([]));
    },
    [form],
  );

  const withApproval = useCallback(
    (run) =>
      run(null).catch((err) => {
        const needed = REQUIRED[getApiErrorCode(err) ?? ""];
        if (!needed) throw err;
        return new Promise((resolve) => ask(needed, run, resolve));
      }),
    [ask],
  );

  const close = (value) => {
    pending.current?.resolve(value);
    pending.current = null;
    setOpen(false);
    form.resetFields();
  };

  const submit = async () => {
    // Field errors are shown under the fields.
    const values = await form.validateFields().catch(() => null);
    if (!values || !pending.current) return;
    setSubmitting(true);
    setError(null);
    const current = pending.current;
    try {
      const result = await current.run({ approver_id: String(values.approver_id), pin: String(values.pin).trim() });
      close(result);
    } catch (err) {
      const code = getApiErrorCode(err) ?? "";
      const nextNeeded = REQUIRED[code];
      if (nextNeeded && nextNeeded !== action) {
        // Approved, but something else needs a manager too (e.g. the credit limit after the discount).
        ask(nextNeeded, current.run, current.resolve);
        return;
      }
      setError(code === "MANAGER_APPROVAL_THROTTLED" ? t("throttled") : code === "MANAGER_APPROVAL_INVALID" || nextNeeded ? t("invalid") : t("failed"));
      form.setFieldsValue({ pin: "" });
      if (!isDiscountApprovalError(err)) close(undefined);
    } finally {
      setSubmitting(false);
    }
  };

  const explainKey = action === "credit_limit_override" ? "explainCreditLimit" : "explain";

  const approvalModal = (
    <Modal
      open={open}
      title={t("title")}
      okText={t("approve")}
      cancelText={t("cancel")}
      confirmLoading={submitting}
      okButtonProps={{ disabled: approvers != null && approvers.length === 0 }}
      onOk={submit}
      onCancel={() => close(undefined)}
      destroyOnHidden
    >
      <div className="mb-4 flex flex-col gap-2">
        <Alert type="warning" showIcon title={t(explainKey)} />
        {approvers != null && approvers.length === 0 ? <Alert type="info" showIcon title={t("noApprovers")} /> : null}
        {error ? <Alert type="error" showIcon title={error} /> : null}
      </div>
      <Form form={form} layout="vertical" requiredMark={false} onFinish={submit}>
        <Form.Item name="approver_id" label={t("approver")} rules={[{ required: true, message: t("approverRequired") }]}>
          <Select
            loading={approvers == null}
            options={(approvers ?? []).map((a) => ({ value: a.id, label: a.name }))}
            placeholder={t("approverPlaceholder")}
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>
        <Form.Item
          name="pin"
          label={t("pin")}
          rules={[
            { required: true, message: t("pinRequired") },
            { pattern: /^[0-9]{4,6}$/, message: t("pinFormat") },
          ]}
        >
          <Input.Password inputMode="numeric" maxLength={6} autoComplete="off" autoFocus onPressEnter={submit} />
        </Form.Item>
      </Form>
    </Modal>
  );

  return { withApproval, approvalModal };
}
