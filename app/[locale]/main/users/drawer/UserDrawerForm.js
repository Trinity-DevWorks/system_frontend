"use client";

import { fetchRoles } from "@/services/rolesApi";
import { useQuery } from "@tanstack/react-query";
import { Form, Input, Select, Switch } from "antd";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   mode: "create" | "edit" | "view";
 *   open: boolean;
 *   t: (key: string) => string;
 * }} props
 */
export default function UserDrawerForm({ form, readOnly, mode, open, t }) {
  const rolesQuery = useQuery({
    queryKey: ["tenant", "roles"],
    queryFn: fetchRoles,
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const roleOptions = (Array.isArray(rolesQuery.data) ? rolesQuery.data : [])
    .filter((r) => r && typeof r === "object" && r.active !== false)
    .map((r) => ({
      value: Number(r.id),
      label: typeof r.name === "string" ? r.name : String(r.id),
    }));

  const showPasswordFields = mode !== "view";

  return (
    <Form form={form} layout="vertical" requiredMark={readOnly ? false : "optional"} disabled={readOnly}>
      <Form.Item
        name="name"
        label={t("fieldName")}
        rules={[
          { required: true, message: t("fieldNameRequired") },
          { max: 255, message: t("fieldNameMax") },
        ]}
      >
        <Input autoComplete="off" />
      </Form.Item>
      <Form.Item
        name="email"
        label={t("fieldEmail")}
        rules={[
          { required: true, message: t("fieldEmailRequired") },
          { type: "email", message: t("fieldEmailInvalid") },
          { max: 255, message: t("fieldEmailMax") },
        ]}
      >
        <Input autoComplete="off" type="email" />
      </Form.Item>
      <Form.Item
        name="role_id"
        label={t("fieldRole")}
        rules={[{ required: true, message: t("fieldRoleRequired") }]}
      >
        <Select
          showSearch
          optionFilterProp="label"
          loading={rolesQuery.isPending}
          placeholder={t("fieldRolePlaceholder")}
          options={roleOptions}
        />
      </Form.Item>
      <Form.Item name="active" label={t("fieldStatus")} valuePropName="checked">
        <Switch checkedChildren={t("statusActive")} unCheckedChildren={t("statusInactive")} />
      </Form.Item>
      {showPasswordFields ? (
        <>
          {mode === "edit" ? (
            <p className="mb-3 text-sm text-black/55 dark:text-white/55">{t("fieldPasswordEditHint")}</p>
          ) : null}
          <Form.Item
            name="password"
            label={t("fieldPassword")}
            rules={
              mode === "create"
                ? [
                    { required: true, message: t("fieldPasswordRequired") },
                    { min: 8, message: t("fieldPasswordMin") },
                  ]
                : [{ min: 8, message: t("fieldPasswordMin") }]
            }
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="password_confirmation"
            label={t("fieldPasswordConfirmation")}
            dependencies={["password"]}
            rules={[
              ...(mode === "create" ? [{ required: true, message: t("fieldPasswordConfirmationRequired") }] : []),
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const password = getFieldValue("password");
                  if (!password && !value) return Promise.resolve();
                  if (value === password) return Promise.resolve();
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
  );
}
