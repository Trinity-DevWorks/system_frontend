"use client";

import { formatTenantDate } from "@/lib/tenant-format";
import { Alert, Button, Descriptions, Form, Tag } from "antd";
import dayjs from "@/lib/dayjs";
import { useEffect, useMemo } from "react";
import { subscriptionValuesToPayload, toDayjsOrNull } from "../../utils/tenantDrawerUtils";
import TenantSubscriptionFields from "./TenantSubscriptionFields";

/**
 * Current plan and period, and (with `tenants,edit`) a form to switch plan or change dates.
 * Saving re-syncs the tenant's modules to the new plan.
 *
 * @param {{
 *   record: Record<string, unknown> | null;
 *   canEdit: boolean;
 *   saving: boolean;
 *   onSave: (body: ReturnType<typeof subscriptionValuesToPayload>) => void;
 *   t: (key: string, values?: Record<string, unknown>) => string;
 * }} props
 */
export default function TenantSubscriptionTab({ record, canEdit, saving, onSave, t }) {
  const [form] = Form.useForm();
  const plan = record?.plan && typeof record.plan === "object" ? /** @type {{ id: number, name: string }} */ (record.plan) : null;

  const initial = useMemo(
    () => ({
      plan_id: plan?.id ?? undefined,
      subscription_starts_at: toDayjsOrNull(record?.subscription_starts_at),
      subscription_ends_at: toDayjsOrNull(record?.subscription_ends_at),
      trial_ends_at: toDayjsOrNull(record?.trial_ends_at),
    }),
    [plan?.id, record?.subscription_starts_at, record?.subscription_ends_at, record?.trial_ends_at],
  );

  // Re-seed after a save or refetch.
  useEffect(() => {
    form.setFieldsValue(initial);
  }, [form, initial]);

  const endsAt = toDayjsOrNull(record?.subscription_ends_at);
  const trialEndsAt = toDayjsOrNull(record?.trial_ends_at);
  const today = dayjs().startOf("day");
  const expired = endsAt != null && endsAt.isBefore(today, "day");
  const daysLeft = endsAt != null ? endsAt.diff(today, "day") : null;

  const dateOr = (value, fallback) => (value ? formatTenantDate(value) || value : fallback);

  return (
    <div className="flex flex-col gap-4">
      {!plan ? <Alert type="warning" showIcon title={t("subscriptionNoPlan")} /> : null}
      {expired ? <Alert type="error" showIcon title={t("subscriptionExpired")} /> : null}

      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label={t("fieldPlan")}>{plan?.name ?? "—"}</Descriptions.Item>
        <Descriptions.Item label={t("fieldSubscriptionStart")}>
          {dateOr(record?.subscription_starts_at, "—")}
        </Descriptions.Item>
        <Descriptions.Item label={t("fieldSubscriptionEnd")}>
          {dateOr(record?.subscription_ends_at, t("noEndDate"))}
          {daysLeft != null && !expired ? (
            <Tag className="ms-2" color={daysLeft <= 14 ? "orange" : "default"} variant="outlined">
              {t("daysLeft", { count: daysLeft })}
            </Tag>
          ) : null}
        </Descriptions.Item>
        <Descriptions.Item label={t("fieldTrialEnd")}>
          {dateOr(record?.trial_ends_at, t("noTrial"))}
          {trialEndsAt != null && !trialEndsAt.isBefore(today, "day") ? (
            <Tag className="ms-2" color="blue" variant="outlined">
              {t("inTrial")}
            </Tag>
          ) : null}
        </Descriptions.Item>
      </Descriptions>

      {canEdit ? (
        <Form
          form={form}
          layout="vertical"
          requiredMark="optional"
          initialValues={initial}
          onFinish={(values) => onSave(subscriptionValuesToPayload(values))}
        >
          <TenantSubscriptionFields form={form} t={t} disabled={saving} />
          <Alert type="info" showIcon className="!mb-3" title={t("subscriptionModulesNote")} />
          <div className="flex justify-end gap-2">
            <Button disabled={saving} onClick={() => form.setFieldsValue(initial)}>
              {t("subscriptionReset")}
            </Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              {t("subscriptionSave")}
            </Button>
          </div>
        </Form>
      ) : null}
    </div>
  );
}
