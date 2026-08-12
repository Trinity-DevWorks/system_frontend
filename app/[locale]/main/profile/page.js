"use client";

import UserAvatarSection from "@/components/profile/UserAvatarSection";
import { AUTH_ME_QUERY_KEY, useAuthMe } from "@/lib/auth-me";
import {
  applyApiFieldErrors,
} from "@/lib/drawer/applyApiFieldErrors";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { updateAuthMe } from "@/services/authMeApi";
import { EditOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Form, Input, Select, Space, Spin } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

function emptyToNull(value) {
  if (value == null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
}

/**
 * @param {Record<string, unknown>} me
 */
function meToFormValues(me) {
  const branches = Array.isArray(me.branches) ? me.branches : [];
  return {
    name: typeof me.name === "string" ? me.name : "",
    email: typeof me.email === "string" ? me.email : "",
    phone: typeof me.phone === "string" ? me.phone : "",
    preferred_branch_id:
      me.preferred_branch_id != null && me.preferred_branch_id !== ""
        ? Number(me.preferred_branch_id)
        : null,
    password: "",
    password_confirmation: "",
    _branches: branches,
    _role: me.role && typeof me.role === "object" ? me.role : null,
  };
}

export default function ProfilePage() {
  const t = useTranslations("Profile");
  const tApiErrors = useTranslations("ApiErrors");
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { me, isLoading, isError, isReady, queryKey } = useAuthMe();

  const [isEditing, setIsEditing] = useState(false);
  const [editBaseline, setEditBaseline] = useState(
    /** @type {Record<string, unknown> | null} */ (null),
  );
  const [isDirty, setIsDirty] = useState(false);

  const serverBaseline = useMemo(
    () => (isReady && me ? meToFormValues(me) : null),
    [isReady, me],
  );

  const branchOptions = useMemo(() => {
    const branches = Array.isArray(me?.branches) ? me.branches : [];
    return branches
      .filter((b) => b && typeof b === "object")
      .map((b) => ({
        value: Number(/** @type {{ id?: unknown }} */ (b).id),
        label:
          typeof /** @type {{ name?: unknown }} */ (b).name === "string"
            ? /** @type {{ name: string }} */ (b).name
            : String(/** @type {{ id?: unknown }} */ (b).id),
      }))
      .filter((o) => !Number.isNaN(o.value));
  }, [me]);

  const roleLabel = useMemo(() => {
    const role = me?.role;
    if (role && typeof role === "object" && typeof role.name === "string") {
      return role.name;
    }
    return "—";
  }, [me]);

  const recomputeDirty = useCallback(() => {
    if (!editBaseline || !isEditing) {
      setIsDirty(false);
      return;
    }
    const v = form.getFieldsValue(true);
    const keys = ["name", "email", "phone", "preferred_branch_id", "password", "password_confirmation"];
    let dirty = false;
    for (const key of keys) {
      const cur = v[key] ?? "";
      const base = editBaseline[key] ?? "";
      if (String(cur) !== String(base ?? "")) {
        dirty = true;
        break;
      }
    }
    setIsDirty(dirty);
  }, [editBaseline, form, isEditing]);

  useEffect(() => {
    if (!isReady || isEditing || !serverBaseline) return;
    form.setFieldsValue({
      name: serverBaseline.name,
      email: serverBaseline.email,
      phone: serverBaseline.phone,
      preferred_branch_id: serverBaseline.preferred_branch_id,
      password: "",
      password_confirmation: "",
    });
  }, [form, isEditing, isReady, serverBaseline]);

  const saveMutation = useMutation({
    mutationFn: (values) => {
      /** @type {Record<string, unknown>} */
      const body = {
        name: values.name,
        email: values.email,
        phone: emptyToNull(values.phone),
        preferred_branch_id:
          values.preferred_branch_id != null && values.preferred_branch_id !== ""
            ? Number(values.preferred_branch_id)
            : null,
      };
      const pwd = String(values.password ?? "");
      if (pwd) {
        body.password = pwd;
        body.password_confirmation = values.password_confirmation;
      }
      return updateAuthMe(
        /** @type {{ name: string; email: string; phone?: string | null; password?: string | null; password_confirmation?: string | null; preferred_branch_id?: number | null }} */ (
          body
        ),
      );
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
      setIsEditing(false);
      setEditBaseline(null);
      setIsDirty(false);
      message.success(t("saveSuccess"));
    },
    onError: (err) => {
      if (!applyApiFieldErrors(form, err)) {
        message.error(
          getLocalizedApiErrorMessage(tApiErrors, err) || t("saveError"),
        );
      }
    },
  });

  const startEditing = useCallback(() => {
    const values = serverBaseline ?? meToFormValues(me ?? {});
    form.setFieldsValue({
      name: values.name,
      email: values.email,
      phone: values.phone,
      preferred_branch_id: values.preferred_branch_id,
      password: "",
      password_confirmation: "",
    });
    setEditBaseline({
      name: values.name,
      email: values.email,
      phone: values.phone,
      preferred_branch_id: values.preferred_branch_id,
      password: "",
      password_confirmation: "",
    });
    setIsDirty(false);
    setIsEditing(true);
  }, [form, me, serverBaseline]);

  const cancelEditing = useCallback(() => {
    if (editBaseline) {
      form.setFieldsValue(editBaseline);
    }
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

  const userId = typeof me.id === "string" ? me.id : String(me.id ?? "");
  const avatar =
    me.avatar && typeof me.avatar === "object"
      ? /** @type {{ id: string, file_name?: string, mime_type?: string }} */ (me.avatar)
      : null;

  return (
    <div className="mx-auto flex w-full max-w-2xl min-h-0 min-w-0 flex-col gap-4 pb-6 pt-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <UserAvatarSection
            userId={userId}
            avatar={avatar}
            invalidateQueryKeys={[AUTH_ME_QUERY_KEY, ["tenant", "users"]]}
            t={t}
            tApiErrors={tApiErrors}
            readOnly={!isEditing}
          />
        </div>
        {!isEditing ? (
          <Button type="default" icon={<EditOutlined />} onClick={startEditing}>
            {t("edit")}
          </Button>
        ) : (
          <Space wrap>
            <Button onClick={cancelEditing} disabled={saveMutation.isPending}>
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
        )}
      </div>

      <Form
        form={form}
        layout="vertical"
        disabled={!isEditing}
        onValuesChange={recomputeDirty}
        onFinish={(values) => saveMutation.mutate(values)}
      >
        <Form.Item
          name="name"
          label={t("fieldName")}
          rules={[
            { required: true, message: t("fieldNameRequired") },
            { max: 255, message: t("fieldNameMax") },
          ]}
        >
          <Input autoComplete="name" />
        </Form.Item>
        <Form.Item
          name="email"
          label={t("fieldEmail")}
          rules={[
            { required: true, message: t("fieldEmailRequired") },
            { type: "email", message: t("fieldEmailInvalid") },
          ]}
        >
          <Input autoComplete="email" />
        </Form.Item>
        <Form.Item
          name="phone"
          label={t("fieldPhone")}
          rules={[{ max: 32, message: t("fieldPhoneMax") }]}
        >
          <Input autoComplete="tel" />
        </Form.Item>
        <Form.Item label={t("fieldRole")}>
          <Input value={roleLabel} disabled readOnly />
        </Form.Item>
        <Form.Item name="preferred_branch_id" label={t("fieldPreferredBranch")}>
          <Select
            allowClear
            options={branchOptions}
            placeholder={t("fieldPreferredBranchPlaceholder")}
          />
        </Form.Item>
        {isEditing ? (
          <>
            <Form.Item
              name="password"
              label={t("fieldPassword")}
              rules={[{ min: 8, message: t("fieldPasswordMin") }]}
            >
              <Input.Password autoComplete="new-password" placeholder={t("fieldPasswordOptional")} />
            </Form.Item>
            <Form.Item
              name="password_confirmation"
              label={t("fieldPasswordConfirmation")}
              dependencies={["password"]}
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
              <Input.Password autoComplete="new-password" />
            </Form.Item>
          </>
        ) : null}
      </Form>
    </div>
  );
}
