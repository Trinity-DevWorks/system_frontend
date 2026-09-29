"use client";

import { formatTenantDateTime } from "@/lib/tenant-format";
import { withConfirmKeyboard } from "@/shared/components/resource-drawer/useDrawerSubmitShortcut";
import { Alert, Button, Descriptions, Divider, Input, Typography } from "antd";
import { useState } from "react";
import {
  TENANT_STATUS_ACTIVE,
  TENANT_STATUS_SUSPENDED,
  isTenantSuspended,
} from "../../utils/tenantDrawerUtils";
import { renderTenantStatus } from "../TenantTable/getTenantTableColumns";
import TenantDeleteModal from "./TenantDeleteModal";

/**
 * Suspend / activate a tenant. Suspending blocks every tenant API call
 * (`TENANT_SUSPENDED`) and revokes the workspace's tokens on the backend.
 * Permanent delete is only offered once the tenant is suspended.
 *
 * @param {{
 *   record: Record<string, unknown> | null;
 *   canEdit: boolean;
 *   canDelete: boolean;
 *   saving: boolean;
 *   deleting: boolean;
 *   onChangeStatus: (body: { status: "active" | "suspended"; reason?: string | null }) => void;
 *   onDelete: (confirmation: string) => void;
 *   modal: import("antd").ModalStaticFunctions;
 *   t: (key: string, values?: Record<string, unknown>) => string;
 * }} props
 */
export default function TenantStatusTab({
  record,
  canEdit,
  canDelete,
  saving,
  deleting,
  onChangeStatus,
  onDelete,
  modal,
  t,
}) {
  const [reason, setReason] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const suspended = isTenantSuspended(record?.status);
  const name = String(record?.name ?? record?.id ?? "");
  const tenantId = String(record?.id ?? "");

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

      {canDelete && tenantId !== "" ? (
        <>
          <Divider className="!my-1" />
          <div className="flex flex-col gap-3">
            <Typography.Text strong type="danger">
              {t("deleteSectionTitle")}
            </Typography.Text>
            <Typography.Paragraph type="secondary" className="!mb-0 text-sm">
              {suspended ? t("deleteHint") : t("deleteRequiresSuspensionHint")}
            </Typography.Paragraph>
            <div className="flex justify-end">
              <Button danger disabled={!suspended || saving} loading={deleting} onClick={() => setDeleteOpen(true)}>
                {t("deleteButton")}
              </Button>
            </div>
          </div>
          <TenantDeleteModal
            open={deleteOpen}
            tenantId={tenantId}
            tenantName={name}
            deleting={deleting}
            onCancel={() => setDeleteOpen(false)}
            onConfirm={onDelete}
            t={t}
          />
        </>
      ) : null}
    </div>
  );
}
