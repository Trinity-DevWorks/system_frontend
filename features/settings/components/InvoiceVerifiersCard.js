"use client";

import {
  createInvoiceVerifier,
  deleteInvoiceVerifier,
  fetchInvoiceVerifiers,
  syncInvoiceVerifier,
  updateInvoiceVerifier,
} from "../api/invoiceVerifiers.api";
import { invoiceVerifiersQueryKey } from "../queries/invoiceVerifiersQueryKeys";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { APP_DISMISS_BUTTON_PROPS } from "@/shared/components/buttons/appDismissButtonProps";
import WalletAddressField from "@/shared/components/inputs/WalletAddressField";
import { withConfirmKeyboard } from "@/shared/components/resource-drawer/useDrawerSubmitShortcut";
import { DeleteOutlined, EditOutlined, PlusOutlined, SyncOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Alert, Button, Card, Form, Input, Modal, Select, Space, Table, Tag, Tooltip, Typography } from "antd";
import { useState } from "react";

const ROLES = ["auditor", "tax_authority", "financier"];
const ROLE_COLORS = { auditor: "blue", tax_authority: "purple", financier: "gold" };
const STATUS_COLORS = { pending: "processing", active: "success", failed: "error", removing: "warning" };
const POLL_INTERVAL_MS = 3000;

/**
 * @param {string} address
 */
function shortAddress(address) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * @param {unknown} value
 */
function emptyToNull(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Banks, auditors, and tax authorities that may attest this company's invoices on chain.
 * @param {{
 *   t: (key: string, values?: Record<string, unknown>) => string;
 *   tApiErrors: (key: string, values?: Record<string, unknown>) => string;
 *   canEdit: boolean;
 * }} props
 */
export default function InvoiceVerifiersCard({ t, tApiErrors, canEdit }) {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const queryKey = invoiceVerifiersQueryKey(hostname);
  const [editing, setEditing] = useState(
    /** @type {import("../api/invoiceVerifiers.api").InvoiceVerifier | "new" | null} */ (null),
  );

  const listQuery = useQuery({
    queryKey,
    queryFn: fetchInvoiceVerifiers,
    enabled: Boolean(hostname),
    refetchOnWindowFocus: false,
    refetchInterval: (query) => {
      const rows = Array.isArray(query.state.data) ? query.state.data : [];
      return rows.some((row) => row.chain_status === "pending" || row.chain_status === "removing")
        ? POLL_INTERVAL_MS
        : false;
    },
  });
  const rows = Array.isArray(listQuery.data) ? listQuery.data : [];

  const onMutationError = (err) => {
    message.error(getLocalizedApiErrorMessage(tApiErrors, err) || t("verifiersSaveError"));
  };

  const saveMutation = useMutation({
    mutationFn: (values) =>
      editing && editing !== "new"
        ? updateInvoiceVerifier(editing.id, {
            name: values.name.trim(),
            role: values.role,
            notes: emptyToNull(values.notes),
          })
        : createInvoiceVerifier({
            name: values.name.trim(),
            role: values.role,
            wallet_address: values.wallet_address.trim(),
            wallet_type: values.wallet_type === "safe" ? "safe" : "wallet",
            notes: emptyToNull(values.notes),
          }),
    onSuccess: () => {
      message.success(t("verifiersSaveSuccess"));
      setEditing(null);
      form.resetFields();
    },
    onError: (err) => {
      if (!applyApiFieldErrors(form, err)) onMutationError(err);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteInvoiceVerifier(id),
    onSuccess: () => message.success(t("verifiersRemoveSuccess")),
    onError: onMutationError,
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const syncMutation = useMutation({
    mutationFn: (id) => syncInvoiceVerifier(id),
    onError: onMutationError,
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({ wallet_type: "wallet" });
    setEditing("new");
  };

  const openEdit = (row) => {
    form.setFieldsValue({ name: row.name, role: row.role, notes: row.notes ?? "" });
    setEditing(row);
  };

  const confirmRemove = (row) => {
    modal.confirm(
      withConfirmKeyboard({
        title: t("verifiersRemoveConfirmTitle"),
        content: t("verifiersRemoveConfirmContent", { name: row.name }),
        okText: t("verifiersRemove"),
        cancelText: t("cancel"),
        okButtonProps: { danger: true },
        onOk: async () => {
          try {
            await deleteMutation.mutateAsync(row.id);
          } catch {
            /* mutation onError */
          }
        },
      }),
    );
  };

  const columns = [
    {
      title: t("verifiersColumnName"),
      dataIndex: "name",
      key: "name",
      render: (_, row) => (
        <div className="min-w-0">
          <div className="truncate">{row.name}</div>
          {row.notes ? (
            <Typography.Text type="secondary" className="block truncate text-xs">
              {row.notes}
            </Typography.Text>
          ) : null}
        </div>
      ),
    },
    {
      title: t("verifiersColumnRole"),
      dataIndex: "role",
      key: "role",
      render: (role) => <Tag color={ROLE_COLORS[role]}>{t(`verifierRoles.${role}`)}</Tag>,
    },
    {
      title: t("verifiersColumnWallet"),
      dataIndex: "wallet_address",
      key: "wallet_address",
      render: (wallet, row) => (
        <Space size={4} wrap>
          <Tooltip title={wallet}>
            <Typography.Text copyable={{ text: wallet }} className="font-mono text-xs" dir="ltr">
              {shortAddress(wallet)}
            </Typography.Text>
          </Tooltip>
          <Tag className="!m-0">{row.wallet_type === "safe" ? t("verifiersTypeSafe") : t("verifiersTypeWallet")}</Tag>
        </Space>
      ),
    },
    {
      title: t("verifiersColumnStatus"),
      dataIndex: "chain_status",
      key: "chain_status",
      render: (status, row) => {
        const tag = <Tag color={STATUS_COLORS[status]}>{t(`verifierStatuses.${status}`)}</Tag>;
        return row.chain_error ? <Tooltip title={row.chain_error}>{tag}</Tooltip> : tag;
      },
    },
    ...(canEdit
      ? [
          {
            key: "actions",
            align: /** @type {const} */ ("end"),
            render: (_, row) =>
              row.chain_status === "removing" ? null : (
                <Space size={4}>
                  <Tooltip title={t("verifiersResync")}>
                    <Button
                      type="text"
                      size="small"
                      icon={<SyncOutlined />}
                      aria-label={t("verifiersResync")}
                      loading={syncMutation.isPending && syncMutation.variables === row.id}
                      onClick={() => syncMutation.mutate(row.id)}
                    />
                  </Tooltip>
                  <Tooltip title={t("edit")}>
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      aria-label={t("edit")}
                      onClick={() => openEdit(row)}
                    />
                  </Tooltip>
                  <Tooltip title={t("verifiersRemove")}>
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      aria-label={t("verifiersRemove")}
                      onClick={() => confirmRemove(row)}
                    />
                  </Tooltip>
                </Space>
              ),
          },
        ]
      : []),
  ];

  const isCreate = editing === "new";

  return (
    <Card
      title={t("verifiersTitle")}
      extra={
        canEdit ? (
          <Button icon={<PlusOutlined />} onClick={openCreate}>
            {t("verifiersAdd")}
          </Button>
        ) : null
      }
    >
      <Typography.Paragraph type="secondary" className="text-sm">
        {t("verifiersHint")}
      </Typography.Paragraph>

      {listQuery.isError ? (
        <Alert
          type="error"
          showIcon
          title={getLocalizedApiErrorMessage(tApiErrors, listQuery.error) || t("verifiersLoadError")}
        />
      ) : (
        <Table
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={rows}
          loading={listQuery.isPending}
          pagination={false}
          locale={{ emptyText: t("verifiersEmpty") }}
          scroll={{ x: true }}
        />
      )}

      <Modal
        open={editing !== null}
        title={isCreate ? t("verifiersAdd") : t("verifiersEdit")}
        onCancel={() => setEditing(null)}
        cancelText={t("cancel")}
        cancelButtonProps={APP_DISMISS_BUTTON_PROPS}
        okText={t("save")}
        okButtonProps={{ loading: saveMutation.isPending }}
        onOk={() => form.submit()}
        forceRender
      >
        <Form form={form} layout="vertical" onFinish={(values) => saveMutation.mutate(values)}>
          <Form.Item
            name="name"
            label={t("verifiersFieldName")}
            rules={[
              { required: true, whitespace: true, message: t("verifiersFieldNameRequired") },
              { max: 255, message: t("verifiersFieldNameMax") },
            ]}
          >
            <Input autoComplete="off" maxLength={255} />
          </Form.Item>
          <Form.Item
            name="role"
            label={t("verifiersFieldRole")}
            rules={[{ required: true, message: t("verifiersFieldRoleRequired") }]}
          >
            <Select options={ROLES.map((role) => ({ value: role, label: t(`verifierRoles.${role}`) }))} />
          </Form.Item>
          {isCreate ? (
            <WalletAddressField
              addressName="wallet_address"
              typeName="wallet_type"
              label={t("verifiersFieldWallet")}
              extra={t("verifiersFieldWalletHelp")}
              invalidMessage={t("fieldWalletAddressInvalid")}
              required
            />
          ) : null}
          <Form.Item name="notes" label={t("verifiersFieldNotes")}>
            <Input.TextArea rows={3} maxLength={2000} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
