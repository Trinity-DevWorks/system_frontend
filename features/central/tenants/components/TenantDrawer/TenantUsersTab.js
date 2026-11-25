"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { formatTenantDateTime } from "@/lib/tenant-format";
import { CrownOutlined, KeyOutlined, MoreOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Checkbox, Dropdown, Empty, Modal, Space, Spin, Table, Tag, Typography } from "antd";
import { useMemo, useState } from "react";
import {
  fetchCentralTenantUsers,
  makeCentralTenantOwner,
  sendCentralTenantUserResetLink,
} from "../../api/tenants.api";
import { centralTenantDetailQueryKey, centralTenantUsersQueryKey } from "../../queries/tenantsQueryKeys";

/**
 * Read-only list of the tenant's users with support actions (central `tenant_users`):
 * send a password-reset link (emailed, and shown once here) and make a user the owner.
 *
 * @param {{
 *   tenantId: string;
 *   canEdit: boolean;
 *   t: (key: string, values?: Record<string, unknown>) => string;
 *   tApiErrors: (key: string) => string;
 * }} props
 */
export default function TenantUsersTab({ tenantId, canEdit, t, tApiErrors }) {
  const { modal, message } = App.useApp();
  const queryClient = useQueryClient();
  const usersKey = centralTenantUsersQueryKey(tenantId);

  const query = useQuery({
    queryKey: usersKey,
    queryFn: () => fetchCentralTenantUsers(tenantId),
    staleTime: QUERY_STALE_TIME.default,
  });

  /** Reset link shown once after it is created. */
  const [resetResult, setResetResult] = useState(
    /** @type {{ email: string, url: string, expires_at: string, email_sent: boolean } | null} */ (null),
  );
  /** User being made owner (confirm dialog), and whether to demote the current owners. */
  const [ownerTarget, setOwnerTarget] = useState(/** @type {Record<string, any> | null} */ (null));
  const [demoteOthers, setDemoteOthers] = useState(true);

  const resetMutation = useMutation({
    mutationFn: (/** @type {string} */ userId) => sendCentralTenantUserResetLink(tenantId, userId),
    onSuccess: (data) => setResetResult(data),
    onError: (err) => message.error(getLocalizedApiErrorMessage(tApiErrors, err)),
  });

  const ownerMutation = useMutation({
    mutationFn: (/** @type {{ userId: string, demote: boolean }} */ v) =>
      makeCentralTenantOwner(tenantId, v.userId, v.demote),
    onSuccess: (data) => {
      if (Array.isArray(data?.users)) queryClient.setQueryData(usersKey, data.users);
      setOwnerTarget(null);
      message.success(t("usersOwnerSuccess"));
    },
    onError: (err) => message.error(getLocalizedApiErrorMessage(tApiErrors, err)),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: usersKey, exact: true });
      // The drawer's Details tab shows the owner.
      queryClient.invalidateQueries({ queryKey: centralTenantDetailQueryKey(tenantId), exact: true });
    },
  });

  const rows = useMemo(() => (Array.isArray(query.data) ? query.data : []), [query.data]);
  const currentOwners = rows.filter((r) => r.is_owner).map((r) => r.name || r.email);

  const confirmReset = (record) => {
    modal.confirm({
      title: t("usersResetConfirmTitle"),
      content: t("usersResetConfirmContent", { email: record.email }),
      okText: t("usersResetConfirmOk"),
      cancelText: t("drawerCancel"),
      onOk: () => resetMutation.mutateAsync(String(record.id)).catch(() => {}),
    });
  };

  const columns = [
    {
      title: t("usersColName"),
      key: "name",
      ellipsis: true,
      render: (_v, r) => (
        <div className="min-w-0">
          <Space size={6}>
            <span className="font-medium">{r.name}</span>
            {r.is_owner ? (
              <Tag color="gold" variant="outlined" icon={<CrownOutlined />} className="!m-0">
                {t("usersOwnerTag")}
              </Tag>
            ) : null}
          </Space>
          <Typography.Text type="secondary" className="block text-xs" ellipsis>
            {r.email}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: t("usersColRoles"),
      dataIndex: "roles",
      key: "roles",
      width: 140,
      render: (roles) =>
        Array.isArray(roles) && roles.length ? (
          <Space size={4} wrap>
            {roles.map((name) => (
              <Tag key={name} className="!m-0">
                {name}
              </Tag>
            ))}
          </Space>
        ) : (
          "—"
        ),
    },
    {
      title: t("usersColStatus"),
      dataIndex: "is_active",
      key: "is_active",
      width: 90,
      render: (active) =>
        active ? <Tag color="success">{t("statusActive")}</Tag> : <Tag>{t("usersInactive")}</Tag>,
    },
    {
      title: t("usersColLastLogin"),
      dataIndex: "last_login_at",
      key: "last_login_at",
      width: 150,
      render: (value) => (value ? formatTenantDateTime(value) : <Typography.Text type="secondary">{t("usersNeverLoggedIn")}</Typography.Text>),
    },
    ...(canEdit
      ? [
          {
            title: "",
            key: "actions",
            width: 48,
            align: /** @type {const} */ ("center"),
            render: (_v, r) => (
              <Dropdown
                trigger={["click"]}
                menu={{
                  items: [
                    {
                      key: "reset",
                      icon: <KeyOutlined />,
                      label: t("usersActionReset"),
                      disabled: !r.is_active,
                      onClick: () => confirmReset(r),
                    },
                    {
                      key: "owner",
                      icon: <CrownOutlined />,
                      label: t("usersActionMakeOwner"),
                      disabled: !r.is_active || r.is_owner,
                      onClick: () => {
                        setDemoteOthers(true);
                        setOwnerTarget(r);
                      },
                    },
                  ],
                }}
              >
                <Button type="text" size="small" icon={<MoreOutlined />} aria-label={t("actionMenu")} />
              </Dropdown>
            ),
          },
        ]
      : []),
  ];

  if (query.isPending) {
    return (
      <div className="flex min-h-32 items-center justify-center">
        <Spin />
      </div>
    );
  }

  if (query.isError) {
    return (
      <Alert
        type="error"
        showIcon
        title={t("usersLoadError")}
        description={getLocalizedApiErrorMessage(tApiErrors, query.error)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Typography.Text type="secondary" className="text-xs">
        {t("usersHint")}
      </Typography.Text>
      {rows.length === 0 ? (
        <Empty description={t("usersEmpty")} />
      ) : (
        <Table
          size="small"
          rowKey="id"
          columns={columns}
          dataSource={rows}
          pagination={rows.length > 10 ? { pageSize: 10, size: "small" } : false}
          loading={resetMutation.isPending}
          scroll={{ x: 560 }}
        />
      )}

      <Modal
        open={resetResult != null}
        title={t("usersResetResultTitle")}
        onCancel={() => setResetResult(null)}
        footer={<Button onClick={() => setResetResult(null)}>{t("drawerClose")}</Button>}
        destroyOnHidden
      >
        {resetResult ? (
          <div className="flex flex-col gap-3">
            {resetResult.email_sent ? (
              <Alert type="success" showIcon title={t("usersResetEmailSent", { email: resetResult.email })} />
            ) : (
              <Alert type="warning" showIcon title={t("usersResetEmailFailed", { email: resetResult.email })} />
            )}
            <div>
              <Typography.Text strong>{t("usersResetLinkLabel")}</Typography.Text>
              <Typography.Paragraph copyable={{ text: resetResult.url }} className="!mb-0 break-all text-xs" code>
                {resetResult.url}
              </Typography.Paragraph>
              <Typography.Text type="secondary" className="text-xs">
                {t("usersResetExpires", { time: formatTenantDateTime(resetResult.expires_at) || resetResult.expires_at })}
              </Typography.Text>
            </div>
            <Alert type="info" showIcon title={t("usersResetShareWarning")} />
          </div>
        ) : null}
      </Modal>

      <Modal
        open={ownerTarget != null}
        title={t("usersOwnerConfirmTitle")}
        okText={t("usersOwnerConfirmOk")}
        cancelText={t("drawerCancel")}
        confirmLoading={ownerMutation.isPending}
        onOk={() =>
          ownerTarget && ownerMutation.mutate({ userId: String(ownerTarget.id), demote: demoteOthers })
        }
        onCancel={() => setOwnerTarget(null)}
        destroyOnHidden
      >
        {ownerTarget ? (
          <div className="flex flex-col gap-3">
            <Typography.Paragraph className="!mb-0">
              {t("usersOwnerConfirmContent", { name: ownerTarget.name || ownerTarget.email })}
            </Typography.Paragraph>
            {currentOwners.length ? (
              <Checkbox checked={demoteOthers} onChange={(e) => setDemoteOthers(e.target.checked)}>
                {t("usersOwnerDemote", { owners: currentOwners.join(", ") })}
              </Checkbox>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
