"use client";

import PlanSelect, { useCentralPlanOptions } from "@/features/central/plans/components/PlanSelect";
import { dayjsDatePattern } from "@/lib/tenant-format";
import { DatePicker, Form } from "antd";
import dayjs from "@/lib/dayjs";
import { subscriptionPeriodEnd } from "../../utils/tenantDrawerUtils";

/**
 * Plan + subscription dates, shared by the create form and the Subscription tab.
 * Picking a plan (or a new start) fills the end date with one billing period; clear it for no end.
 *
 * @param {{
 *   form: import("antd").FormInstance;
 *   t: (key: string) => string;
 *   disabled?: boolean;
 * }} props
 */
export default function TenantSubscriptionFields({ form, t, disabled = false }) {
  const { plans } = useCentralPlanOptions();
  const pattern = dayjsDatePattern();

  const fillEndDate = (planId, start) => {
    const plan = plans.find((p) => Number(p.id) === Number(planId));
    if (!plan) return;
    form.setFieldValue(
      "subscription_ends_at",
      subscriptionPeriodEnd(start ?? dayjs().startOf("day"), plan.billing_cycle),
    );
  };

  return (
    <>
      <Form.Item
        name="plan_id"
        label={t("fieldPlan")}
        rules={[{ required: true, message: t("fieldPlanRequired") }]}
        extra={t("fieldPlanHint")}
      >
        <PlanSelect
          disabled={disabled}
          onChange={(value) => fillEndDate(value, form.getFieldValue("subscription_starts_at"))}
        />
      </Form.Item>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Form.Item
          name="subscription_starts_at"
          label={t("fieldSubscriptionStart")}
          rules={[
            {
              // Backdating is fine; a future start would not delay anything (backend rejects it too).
              validator(_, value) {
                if (!value || !value.isAfter(dayjs(), "day")) return Promise.resolve();
                return Promise.reject(new Error(t("fieldSubscriptionStartFuture")));
              },
            },
          ]}
        >
          <DatePicker
            className="w-full"
            format={pattern}
            disabled={disabled}
            disabledDate={(day) => day.isAfter(dayjs(), "day")}
            placeholder={t("fieldSubscriptionStartPlaceholder")}
            onChange={(value) => fillEndDate(form.getFieldValue("plan_id"), value)}
          />
        </Form.Item>
        <Form.Item
          name="subscription_ends_at"
          label={t("fieldSubscriptionEnd")}
          extra={t("fieldSubscriptionEndHint")}
          dependencies={["subscription_starts_at"]}
          rules={[
            ({ getFieldValue }) => ({
              validator(_, value) {
                const start = getFieldValue("subscription_starts_at");
                if (!value || !start || !value.isBefore(start, "day")) return Promise.resolve();
                return Promise.reject(new Error(t("fieldSubscriptionEndBeforeStart")));
              },
            }),
          ]}
        >
          <DatePicker className="w-full" format={pattern} disabled={disabled} placeholder={t("noEndDate")} />
        </Form.Item>
      </div>
      <Form.Item
        name="trial_ends_at"
        label={t("fieldTrialEnd")}
        extra={t("fieldTrialEndHint")}
        dependencies={["subscription_starts_at", "subscription_ends_at"]}
        rules={[
          ({ getFieldValue }) => ({
            // The trial sits inside the subscription (same rule as the backend).
            validator(_, value) {
              if (!value) return Promise.resolve();
              const start = getFieldValue("subscription_starts_at");
              const end = getFieldValue("subscription_ends_at");
              if (start && value.isBefore(start, "day")) {
                return Promise.reject(new Error(t("fieldTrialEndBeforeStart")));
              }
              if (end && value.isAfter(end, "day")) {
                return Promise.reject(new Error(t("fieldTrialEndAfterEnd")));
              }
              return Promise.resolve();
            },
          }),
        ]}
      >
        <DatePicker className="w-full" format={pattern} disabled={disabled} placeholder={t("noTrial")} />
      </Form.Item>
    </>
  );
}
