"use client";

import { formatTenantDateTime } from "@/lib/tenant-format";
import { withConfirmKeyboard } from "@/shared/components/resource-drawer/useDrawerSubmitShortcut";
import { Alert, Button, Descriptions, Input, Typography } from "antd";
import { useState } from "react";
import {
  TENANT_STATUS_ACTIVE,
  TENANT_STATUS_SUSPENDED,
  isTenantSuspended,
} from "../../utils/tenantDrawerUtils";
import { renderTenantStatus } from "../TenantTable/getTenantTableColumns";

/**
 * Suspend / activate a tenant. Suspending blocks every tenant API call
 * (`TENANT_SUSPENDED`) and revokes the workspace's tokens on the backend.
 *
 * @param {{
 *   record: Record<string, unknown> | null;
 *   canEdit: boolean;
 *   saving: boolean;
 *   onChangeStatus: (body: { status: "active" | "suspended"; reason?: string | null }) => void;
 *   modal: import("antd").ModalStaticFunctions;
 *   t: (key: string, values?: Record<string, unknown>) => string;
 * }} props
 */
export default function TenantStatusTab({ record, canEdit, saving, onChangeStatus, modal, t }) {
  const [reason, setReason] = useState("");
  const suspended = isTenantSuspended(record?.status);
  const name = String(record?.name ?? record?.id ?? "");

  const confirmSuspend = () => {
    modal.confirm(
      withConfirmKeyboard({
        title: t("statusSuspendConfirmTitle"),
        content: t("statusSuspendConfirmContent", { name }),
        okText: t("statusSuspend"),
        cancelText: t("statusConfirmCancel"),
        okButtonProps: { danger: true },
        onOk: () => {
          const trimmed = reason.trim();
          onChangeStatus({ status: TENANT_STATUS_SUSPENDED, reason: trimmed === "" ? null : trimmed });
          setReason("");
        },
      }),
    );
  };

  const confirmActivate = () => {
    modal.confirm(
      withConfirmKeyboard({
        title: t("statusActivateConfirmTitle"),
        content: t("statusActivateConfirmContent", { name }),
        okText: t("statusActivate"),
        cancelText: t("statusConfirmCancel"),
        onOk: () => onChangeStatus({ status: TENANT_STATUS_ACTIVE }),
      }),
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label={t("colStatus")}>{renderTenantStatus(record?.status, t)}</Descriptions.Item>
        {suspended ? (
          <>
            <Descriptions.Item label={t("fieldSuspendedAt")}>
              {formatTenantDateTime(record?.suspended_at) || "\u2014"}
            </Descriptions.Item>
            <Descriptions.Item label={t("fieldSuspensionReason")}>
              {typeof record?.suspension_reason === "string" && record.suspension_reason.trim()
                ? record.suspension_reason
                : "\u2014"}
            </Descriptions.Item>
          </>
        ) : null}
      </Descriptions>

      {!canEdit ? null : suspended ? (
        <div className="flex flex-col gap-3">
          <Typography.Paragraph type="secondary" className="!mb-0 text-sm">
            {t("statusActivateHint")}
          </Typography.Paragraph>
          <div className="flex justify-end">
            <Button type="primary" loading={saving} onClick={confirmActivate}>
              {t("statusActivate")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Alert type="warning" showIcon title={t("statusSuspendHint")} />
          <div className="flex flex-col gap-1">
            <Typography.Text>{t("fieldSuspensionReason")}</Typography.Text>
            <Input.TextArea
              rows={3}
              maxLength={1000}
              showCount
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("fieldSuspensionReasonPlaceholder")}
            />
          </div>
          <div className="flex justify-end">
            <Button danger type="primary" loading={saving} onClick={confirmSuspend}>
              {t("statusSuspend")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
