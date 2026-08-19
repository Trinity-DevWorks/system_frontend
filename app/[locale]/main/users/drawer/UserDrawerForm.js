"use client";

import { fetchBranchNames } from "@/services/branchesApi";
import { fetchRoleNames } from "@/services/rolesApi";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Form, Input, Select, Space, Switch } from "antd";
import { useEffect, useMemo } from "react";
import { USER_LOOKUP_ADD_BRANCH, USER_LOOKUP_ADD_ROLE } from "./userDrawerUtils";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   mode: "create" | "edit" | "view";
 *   open: boolean;
 *   t: (key: string) => string;
 *   onOpenBranchCreate?: (rowIndex: number) => void;
 *   onOpenRoleCreate?: (rowIndex: number) => void;
 * }} props
 */
export default function UserDrawerForm({
  form,
  readOnly,
  mode,
  open,
  t,
  onOpenBranchCreate,
  onOpenRoleCreate,
}) {
  const rolesQuery = useQuery({
    queryKey: ["tenant", "roles"],
    queryFn: fetchRoleNames,
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const branchesQuery = useQuery({
    queryKey: ["tenant", "branches"],
    queryFn: fetchBranchNames,
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const roleOptions = useMemo(() => {
    const base = (Array.isArray(rolesQuery.data) ? rolesQuery.data : [])
      .filter((r) => r && typeof r === "object" && r.is_active !== false)
      .map((r) => ({
        value: Number(r.id),
        label: typeof r.name === "string" ? r.name : String(r.id),
      }));
    if (readOnly || !onOpenRoleCreate) return base;
    return [{ value: USER_LOOKUP_ADD_ROLE, label: t("fieldRoleAddNew") }, ...base];
  }, [rolesQuery.data, readOnly, onOpenRoleCreate, t]);

  const branchOptionsBase = useMemo(
    () =>
      (Array.isArray(branchesQuery.data) ? branchesQuery.data : [])
        .filter((b) => b && typeof b === "object" && b.is_active !== false)
        .map((b) => ({
          value: Number(b.id),
          label: typeof b.name === "string" ? b.name : String(b.id),
        })),
    [branchesQuery.data],
  );

  useEffect(() => {
    if (!open || mode !== "create" || readOnly) return;
    if (!Array.isArray(branchesQuery.data) || branchesQuery.data.length === 0) return;

    const current = form.getFieldValue("branch_assignments");
    if (Array.isArray(current) && current.length > 0) return;

    const activeBranches = branchesQuery.data.filter(
      (b) => b && typeof b === "object" && b.is_active !== false,
    );
    const defaultBranch =
      activeBranches.find((b) => b.is_default === true) ?? activeBranches[0] ?? null;

    if (defaultBranch?.id != null) {
      form.setFieldValue("branch_assignments", [
        { branch_id: Number(defaultBranch.id), role_id: undefined },
      ]);
    }
  }, [open, mode, readOnly, branchesQuery.data, form]);

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
        name="phone"
        label={t("fieldPhone")}
        rules={[{ max: 32, message: t("fieldPhoneMax") }]}
      >
        <Input autoComplete="off" />
      </Form.Item>

      <Form.List
        name="branch_assignments"
        rules={[
          {
            validator: async (_, value) => {
              if (!Array.isArray(value) || value.length < 1) {
                return Promise.reject(new Error(t("fieldBranchAssignmentsRequired")));
              }
              return Promise.resolve();
            },
          },
        ]}
      >
        {(fields, { add, remove }, { errors }) => (
          <div className="mb-4">
            <div className="mb-2 text-sm font-medium text-black/85 dark:text-white/85">
              {t("fieldBranchAssignments")}
            </div>
            <p className="mb-3 text-sm text-black/55 dark:text-white/55">{t("fieldBranchAssignmentsHint")}</p>
            {fields.map(({ key, name, ...restField }) => {
              const selectedBranchIds = (form.getFieldValue("branch_assignments") ?? [])
                .map((row, index) => (index === name ? null : Number(row?.branch_id)))
                .filter((id) => id != null && !Number.isNaN(id));

              const branchOptions = [
                ...(readOnly || !onOpenBranchCreate
                  ? []
                  : [{ value: USER_LOOKUP_ADD_BRANCH, label: t("fieldBranchAddNew") }]),
                ...branchOptionsBase.map((option) => ({
                  ...option,
                  disabled: selectedBranchIds.includes(option.value),
                })),
              ];

              const branchFieldPath = /** @type {const} */ (["branch_assignments", name, "branch_id"]);
              const roleFieldPath = /** @type {const} */ (["branch_assignments", name, "role_id"]);

              return (
                <Space key={key} className="mb-2 flex w-full" align="start">
                  <Form.Item
                    {...restField}
                    name={[name, "branch_id"]}
                    className="mb-0 min-w-[160px] flex-1"
                    rules={[{ required: true, message: t("fieldBranchRequired") }]}
                    getValueFromEvent={(v) =>
                      v === USER_LOOKUP_ADD_BRANCH ? form.getFieldValue(branchFieldPath) : v
                    }
                  >
                    <Select
                      showSearch
                      optionFilterProp="label"
                      loading={branchesQuery.isPending}
                      placeholder={t("fieldBranchPlaceholder")}
                      options={branchOptions}
                      onSelect={(value) => {
                        if (value === USER_LOOKUP_ADD_BRANCH) {
                          onOpenBranchCreate?.(name);
                        }
                      }}
                    />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, "role_id"]}
                    className="mb-0 min-w-[160px] flex-1"
                    rules={[{ required: true, message: t("fieldRoleRequired") }]}
                    getValueFromEvent={(v) =>
                      v === USER_LOOKUP_ADD_ROLE ? form.getFieldValue(roleFieldPath) : v
                    }
                  >
                    <Select
                      showSearch
                      optionFilterProp="label"
                      loading={rolesQuery.isPending}
                      placeholder={t("fieldRolePlaceholder")}
                      options={roleOptions}
                      onSelect={(value) => {
                        if (value === USER_LOOKUP_ADD_ROLE) {
                          onOpenRoleCreate?.(name);
                        }
                      }}
                    />
                  </Form.Item>
                  {!readOnly && fields.length > 1 ? (
                    <MinusCircleOutlined
                      className="mt-2 text-black/45 hover:text-red-500"
                      onClick={() => remove(name)}
                      aria-label={t("fieldBranchAssignmentRemove")}
                    />
                  ) : null}
                </Space>
              );
            })}
            {!readOnly ? (
              <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                {t("fieldBranchAssignmentAdd")}
              </Button>
            ) : null}
            <Form.ErrorList errors={errors} />
          </div>
        )}
      </Form.List>

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
