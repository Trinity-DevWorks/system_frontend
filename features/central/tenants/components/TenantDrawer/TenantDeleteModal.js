"use client";

import { Alert, Input, Modal, Typography } from "antd";
import { useState } from "react";

/**
 * Permanent-delete confirmation: the danger button stays disabled until the
 * tenant id is typed exactly (the backend checks `confirmation` too).
 *
 * @param {{
 *   open: boolean;
 *   tenantId: string;
 *   tenantName: string;
 *   deleting: boolean;
 *   onCancel: () => void;
 *   onConfirm: (confirmation: string) => void;
 *   t: (key: string, values?: Record<string, unknown>) => string;
 * }} props
 */
export default function TenantDeleteModal({ open, tenantId, tenantName, deleting, onCancel, onConfirm, t }) {
  const [typed, setTyped] = useState("");
  const matches = typed.trim() === tenantId;

  const close = () => {
    if (deleting) return;
    setTyped("");
    onCancel();
  };

  const confirm = () => {
    if (matches && !deleting) onConfirm(typed.trim());
  };

  return (
    <Modal
      open={open}
      title={t("deleteConfirmTitle")}
      okText={t("deleteConfirmOk")}
      cancelText={t("statusConfirmCancel")}
      okButtonProps={{ danger: true, disabled: !matches, loading: deleting }}
      cancelButtonProps={{ disabled: deleting }}
      onOk={confirm}
      onCancel={close}
      afterClose={() => setTyped("")}
      mask={{ closable: !deleting }}
      closable={!deleting}
      destroyOnHidden
    >
      <div className="flex flex-col gap-3">
        <Alert type="error" showIcon title={t("deleteConfirmContent", { name: tenantName })} />
        <Typography.Text>
          {t("deleteConfirmLabel")} <Typography.Text code>{tenantId}</Typography.Text>
        </Typography.Text>
        <Input
          autoFocus
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onPressEnter={confirm}
          placeholder={tenantId}
          autoComplete="off"
          spellCheck={false}
          disabled={deleting}
        />
      </div>
    </Modal>
  );
}
