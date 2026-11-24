"use client";

import { useTenantSubscription } from "../queries/subscription";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import dayjs from "@/lib/dayjs";
import { formatTenantDate, formatTenantMoney } from "@/lib/tenant-format";
import { ReloadOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Descriptions, Progress, Spin, Tag, Typography } from "antd";
import { useTranslations } from "next-intl";

/** Usage rows in display order: limit key → translation key. */
const USAGE_ROWS = [
  ["users", "usageUsers"],
  ["branches", "usageBranches"],
  ["warehouses", "usageWarehouses"],
  ["storage_mb", "usageStorage"],
];

/** @param {unknown} value */
const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Read-only view of the tenant's plan, subscription period and usage against the plan limits.
 */
export default function SubscriptionPage() {
  const t = useTranslations("Subscription");
  const tApiErrors = useTranslations("ApiErrors");
  const { data, isPending, isError, error, isFetching, refetch } = useTenantSubscription();

  if (isPending) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <Spin />
      </div>
    );
  }

  if (isError || !data || typeof data !== "object") {
    return (
      <Alert
        type="error"
        showIcon
        title={t("loadError")}
        description={getLocalizedApiErrorMessage(tApiErrors, error)}
        action={
          <Button size="small" onClick={() => refetch()}>
            {t("retry")}
          </Button>
        }
      />
    );
  }

  const info = /** @type {Record<string, any>} */ (data);
  const plan = info.plan && typeof info.plan === "object" ? info.plan : null;
  const limits = info.limits ?? {};
  const usage = info.usage ?? {};

  const today = dayjs().startOf("day");
  const endsAt = info.subscription_ends_at ? dayjs(info.subscription_ends_at) : null;
  const trialEndsAt = info.trial_ends_at ? dayjs(info.trial_ends_at) : null;
  const daysLeft = endsAt ? endsAt.diff(today, "day") : null;
  const inTrial = trialEndsAt != null && !trialEndsAt.isBefore(today, "day");

  return (
    <div className="mx-auto flex w-full max-w-2xl min-h-0 min-w-0 flex-col gap-4 pb-6 pt-2">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Typography.Text type="secondary" className="text-xs uppercase tracking-wide">
              {t("currentPlan")}
            </Typography.Text>
            <Typography.Title level={3} className="!mb-1 !mt-0">
              {plan?.name ?? t("noPlan")}
            </Typography.Title>
            {plan ? (
              <Typography.Text type="secondary">
                {formatTenantMoney(plan.price)} {plan.currency} / {t(`cycle_${plan.billing_cycle}`)}
              </Typography.Text>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {inTrial ? (
              <Tag color="blue" variant="outlined" className="!m-0">
                {t("inTrial")}
              </Tag>
            ) : null}
            <Button icon={<ReloadOutlined />} loading={isFetching} onClick={() => refetch()} aria-label={t("refresh")} />
          </div>
        </div>

        {daysLeft != null && daysLeft <= 14 ? (
          <Alert
            className="!mt-4"
            type="warning"
            showIcon
            title={t("endingSoon", { count: Math.max(0, daysLeft) })}
            description={t("contactProvider")}
          />
        ) : null}

        <Descriptions className="!mt-4" column={1} size="small" bordered>
          <Descriptions.Item label={t("startsOn")}>
            {formatTenantDate(info.subscription_starts_at) || "—"}
          </Descriptions.Item>
          <Descriptions.Item label={t("endsOn")}>
            {endsAt ? formatTenantDate(info.subscription_ends_at) : t("noEndDate")}
            {daysLeft != null && daysLeft >= 0 ? (
              <Typography.Text type="secondary" className="ms-2 text-xs">
                {t("daysLeft", { count: daysLeft })}
              </Typography.Text>
            ) : null}
          </Descriptions.Item>
          {trialEndsAt ? (
            <Descriptions.Item label={t("trialEndsOn")}>{formatTenantDate(info.trial_ends_at)}</Descriptions.Item>
          ) : null}
        </Descriptions>
      </Card>

      <Card title={t("usage")}>
        <div className="flex flex-col gap-4">
          {USAGE_ROWS.map(([key, labelKey]) => {
            const used = toNumber(usage[key]);
            const max = limits[key];
            const unlimited = max === null || max === undefined;
            const percent = unlimited || toNumber(max) === 0 ? 0 : Math.min(100, Math.round((used / toNumber(max)) * 100));
            const full = !unlimited && used >= toNumber(max);
            const unit = key === "storage_mb" ? ` ${t("mb")}` : "";
            return (
              <div key={key} className="min-w-0">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span>{t(labelKey)}</span>
                  <Typography.Text type={full ? "danger" : "secondary"} className="shrink-0">
                    {unlimited
                      ? t("usedOfUnlimited", { used: `${used}${unit}` })
                      : t("usedOfMax", { used: `${used}${unit}`, max: `${max}${unit}` })}
                  </Typography.Text>
                </div>
                {unlimited ? null : (
                  <Progress
                    percent={percent}
                    size="small"
                    showInfo={false}
                    status={full ? "exception" : percent >= 80 ? "active" : "normal"}
                  />
                )}
              </div>
            );
          })}
        </div>
        <Typography.Paragraph type="secondary" className="!mb-0 !mt-4 text-xs">
          {t("upgradeHint")}
        </Typography.Paragraph>
      </Card>
    </div>
  );
}
