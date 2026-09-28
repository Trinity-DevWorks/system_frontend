"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { useQuery } from "@tanstack/react-query";
import { Form, Input, Select, Switch } from "antd";
import { useMemo } from "react";
import { fetchCentralRoleNames } from "../../../roles/api/roles.api";
import { CENTRAL_ROLES_LIST_QUERY_KEY } from "../../../roles/queries/rolesQueryKeys";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   mode: "create" | "edit" | "view";
 *   open: boolean;
 *   t: (key: string) => string;
 * }} props
 */
export default function CentralUserDrawerForm({ form, readOnly, mode, open, t }) {
  const rolesQuery = useQuery({
    queryKey: CENTRAL_ROLES_LIST_QUERY_KEY,
    queryFn: fetchCentralRoleNames,
    enabled: open,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const selectedRoleId = Form.useWatch("central_role_id", form);

  const roleOptions = useMemo(
    () =>
      (Array.isArray(rolesQuery.data) ? rolesQuery.data : [])
        .filter(
          (r) =>
            r &&
            typeof r === "object" &&
            (r.is_active !== false || Number(r.id) === Number(selectedRoleId)),
        )
        .map((r) => ({
          value: Number(r.id),
          label: typeof r.name === "string" ? r.name : String(r.id),
        })),
    [rolesQuery.data, selectedRoleId],
  );

  const showPasswordFields = mode !== "view";

  return (
    <Form form={form} layout="vertical" requiredMark={readOnly ? false : "optional"} disabled={readOnly}>
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
        name="central_role_id"
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
      <Form.Item name="is_active" label={t("fieldStatus")} valuePropName="checked">
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
