"use client";

import { useRouter } from "@/i18n/navigation";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { updateCentralAuthMe } from "@/lib/api/centralAuthMe";
import { useCentralAuthMe } from "@/lib/central-auth-me";
import { clearQueryCacheOnAuthChange } from "@/lib/clear-query-cache-on-auth";
import { applyApiFieldErrors } from "@/lib/drawer/applyApiFieldErrors";
import { clearAllSessionTokens } from "@/lib/session";
import { APP_DISMISS_BUTTON_PROPS } from "@/shared/components/buttons/appDismissButtonProps";
import { EditOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Avatar, Button, Card, Form, Input, Space, Spin, Tag, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

const DIRTY_KEYS = /** @type {const} */ (["name", "password", "password_confirmation"]);

/** @param {Record<string, unknown>} me */
function meToFormValues(me) {
  return {
    name: typeof me.name === "string" ? me.name : "",
    email: typeof me.email === "string" ? me.email : "",
    current_password: "",
    password: "",
    password_confirmation: "",
  };
}

export default function CentralProfilePage() {
  const t = useTranslations("CentralProfile");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { me, isLoading, isError, isReady, queryKey } = useCentralAuthMe();

  const [isEditing, setIsEditing] = useState(false);
  const [editBaseline, setEditBaseline] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [isDirty, setIsDirty] = useState(false);

  const serverBaseline = useMemo(() => (isReady && me ? meToFormValues(me) : null), [isReady, me]);

  const role = me?.role && typeof me.role === "object" ? /** @type {{ name?: string; is_system?: boolean }} */ (me.role) : null;

  const currentPassword = Form.useWatch("current_password", form);
  const canChangePassword = String(currentPassword ?? "").length > 0;

  const recomputeDirty = useCallback(() => {
    if (!editBaseline || !isEditing) {
      setIsDirty(false);
      return;
    }
    const v = form.getFieldsValue(true);
    setIsDirty(DIRTY_KEYS.some((key) => String(v[key] ?? "") !== String(editBaseline[key] ?? "")));
  }, [editBaseline, form, isEditing]);

  useEffect(() => {
    if (!isReady || isEditing || !serverBaseline) return;
    form.setFieldsValue(serverBaseline);
  }, [form, isEditing, isReady, serverBaseline]);

  const signOutAfterPasswordChange = useCallback(() => {
    clearAllSessionTokens();
    clearQueryCacheOnAuthChange(queryClient);
    router.replace("/login");
  }, [queryClient, router]);

  const saveMutation = useMutation({
    mutationFn: (values) => {
      /** @type {{ name: string; current_password?: string; password?: string; password_confirmation?: string }} */
      const body = { name: String(values.name ?? "").trim() };
      const pwd = String(values.password ?? "");
      if (pwd) {
        body.current_password = values.current_password;
        body.password = pwd;
        body.password_confirmation = values.password_confirmation;
      }
      return updateCentralAuthMe(body);
    },
    onSuccess: (data, values) => {
      if (String(values.password ?? "")) {
        // The backend revokes every token on password change, including this session's.
        modal.success({
          title: t("passwordChangedTitle"),
          content: t("passwordChangedContent"),
          okText: t("passwordChangedOk"),
          afterClose: signOutAfterPasswordChange,
        });
        return;
      }
      queryClient.setQueryData(queryKey, (old) =>
        old && typeof old === "object" ? { ...old, ...data } : data,
      );
      setIsEditing(false);
      setEditBaseline(null);
      setIsDirty(false);
      message.success(t("saveSuccess"));
    },
    onError: (err) => {
      if (!applyApiFieldErrors(form, err)) {
        message.error(getLocalizedApiErrorMessage(tApiErrors, err) || t("saveError"));
      }
    },
  });

  const startEditing = useCallback(() => {
    const values = serverBaseline ?? meToFormValues(me ?? {});
    form.setFieldsValue(values);
    setEditBaseline(values);
    setIsDirty(false);
    setIsEditing(true);
  }, [form, me, serverBaseline]);

  const cancelEditing = useCallback(() => {
    if (editBaseline) form.setFieldsValue(editBaseline);
    setIsDirty(false);
    setIsEditing(false);
    setEditBaseline(null);
  }, [editBaseline, form]);

  if (isLoading) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <Spin />
      </div>
    );
  }

  if (isError || !me) {
    return <Alert type="error" showIcon title={t("loadError")} />;
  }

  const displayName = typeof me.name === "string" && me.name.trim() ? me.name.trim() : "\u2014";
  const displayEmail = typeof me.email === "string" ? me.email.trim() : "";
  const initial = displayName !== "\u2014" ? displayName.charAt(0).toUpperCase() : "?";

  const actions = !isEditing ? (
    <Button type="default" icon={<EditOutlined />} onClick={startEditing}>
      {t("edit")}
    </Button>
  ) : (
    <Space wrap>
      <Button {...APP_DISMISS_BUTTON_PROPS} onClick={cancelEditing} disabled={saveMutation.isPending}>
        {t("cancel")}
      </Button>
      <Button
        type={isDirty ? "primary" : "default"}
        disabled={!isDirty}
        loading={saveMutation.isPending}
        onClick={() => form.submit()}
      >
        {t("save")}
      </Button>
    </Space>
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl min-h-0 min-w-0 flex-col gap-4 pb-6 pt-2">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <Avatar size={88} className="shrink-0 text-3xl">
              {initial}
            </Avatar>
            <div className="min-w-0 flex-1 pt-1">
              <Typography.Title level={3} className="!mb-1 !mt-0 truncate">
                {displayName}
              </Typography.Title>
              {displayEmail ? (
                <Typography.Text type="secondary" copyable className="block max-w-full" ellipsis>
                  {displayEmail}
                </Typography.Text>
              ) : null}
              {role?.name ? (
                <div className="mt-2">
                  <Tag className="!m-0" color={role.is_system ? "gold" : undefined}>
                    {role.name}
                  </Tag>
                </div>
              ) : null}
            </div>
          </div>
          <div className="shrink-0">{actions}</div>
        </div>
      </Card>

      <Card title={t("accountDetails")}>
        <Form
          form={form}
          layout="vertical"
          disabled={!isEditing}
          onValuesChange={(changed) => {
            if ("current_password" in changed && !String(changed.current_password ?? "").length) {
              form.setFieldsValue({ password: "", password_confirmation: "" });
            }
            recomputeDirty();
          }}
          onFinish={(values) => saveMutation.mutate(values)}
        >
          <Form.Item
            name="name"
            label={t("fieldName")}
            rules={[
              { required: true, whitespace: true, message: t("fieldNameRequired") },
              { max: 255, message: t("fieldNameMax") },
              {
                validator(_, value) {
                  const name = String(value ?? "").trim();
                  if (!name) return Promise.resolve();
                  if (!/^[\p{L}\p{M}][\p{L}\p{M} .'\u2019-]*$/u.test(name)) {
                    return Promise.reject(new Error(t("fieldNameInvalid")));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input autoComplete="name" />
          </Form.Item>
          <Form.Item name="email" label={t("fieldEmail")} extra={isEditing ? t("fieldEmailReadOnlyHint") : undefined}>
            <Input autoComplete="email" disabled readOnly />
          </Form.Item>
          {isEditing ? (
            <>
              <Typography.Paragraph type="secondary" className="text-sm">
                {t("passwordChangeHint")}
              </Typography.Paragraph>
              <Form.Item
                name="current_password"
                label={t("fieldCurrentPassword")}
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const pwd = getFieldValue("password");
                      if (!pwd) return Promise.resolve();
                      if (String(value ?? "").length) return Promise.resolve();
                      return Promise.reject(new Error(t("fieldCurrentPasswordRequired")));
                    },
                  }),
                ]}
              >
                <Input.Password autoComplete="current-password" placeholder={t("fieldCurrentPasswordPlaceholder")} />
              </Form.Item>
              <Form.Item
                name="password"
                label={t("fieldPassword")}
                dependencies={["current_password"]}
                rules={[{ min: 8, message: t("fieldPasswordMin") }]}
              >
                <Input.Password
                  autoComplete="new-password"
                  disabled={!canChangePassword}
                  placeholder={t("fieldPasswordOptional")}
                />
              </Form.Item>
              <Form.Item
                name="password_confirmation"
                label={t("fieldPasswordConfirmation")}
                dependencies={["password", "current_password"]}
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const pwd = getFieldValue("password");
                      if (!pwd && !value) return Promise.resolve();
                      if (pwd === value) return Promise.resolve();
                      return Promise.reject(new Error(t("fieldPasswordMismatch")));
                    },
                  }),
                ]}
              >
                <Input.Password autoComplete="new-password" disabled={!canChangePassword} />
              </Form.Item>
            </>
          ) : null}
        </Form>
      </Card>
    </div>
  );
}
