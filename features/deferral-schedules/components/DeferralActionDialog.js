"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import {
  dayjsDatePattern,
  formatTenantMoneyWithSymbol,
} from "@/lib/tenant-format";
import { useMutation } from "@tanstack/react-query";
import { App, DatePicker, Form, Input, Modal, Select, Typography } from "antd";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import {
  cancelDeferralSchedule,
  recognizeRemainingDeferral,
  rescheduleDeferralSchedule,
} from "../api/deferralSchedules.api";

/** @typedef {"reschedule" | "recognize" | "cancel"} DeferralDialog */

/**
 * Reschedule / Recognise remaining / Cancel for one schedule.
 * Used by the schedule drawer footer and by the list's row menu (opens on its own, no drawer).
 *
 * @param {{
 *   dialog: DeferralDialog | null;
 *   record: Record<string, any> | null;
 *   onClose: () => void;
 *   onDone?: (data: any) => void;
 * }} props
 */
export default function DeferralActionDialog({
  dialog,
  record,
  onClose,
  onDone,
}) {
  const t = useTranslations("DeferralSchedules");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, notification, modal } = App.useApp();
  const [form] = Form.useForm();
  const id = record?.id != null ? String(record.id) : "";
  const required = (label) => [
    { required: true, message: t("fieldRequired", { field: label }) },
  ];

  // Fresh values each time a dialog opens.
  useEffect(() => {
    if (!dialog) return;
    form.resetFields();
    if (dialog === "reschedule") {
      form.setFieldsValue({
        end_date: record?.end_date ? dayjs(record.end_date) : null,
        method: record?.method,
      });
    } else if (dialog === "recognize") {
      form.setFieldsValue({ date: dayjs() });
    }
  }, [dialog, record, form]);

  const run = useMutation({
    mutationFn: (values) => {
      if (dialog === "reschedule") {
        return rescheduleDeferralSchedule(id, {
          end_date: dayjs(values.end_date).format("YYYY-MM-DD"),
          method: values.method,
        });
      }
      if (dialog === "recognize") {
        return recognizeRemainingDeferral(id, {
          date: dayjs(values.date).format("YYYY-MM-DD"),
        });
      }
      return cancelDeferralSchedule(id, { reason: values.reason });
    },
    onSuccess: (data) => {
      const warnings = data?.warnings ?? data?.schedule?.warnings;
      if (Array.isArray(warnings) && warnings.length) {
        modal.warning({
          title: t("balanceWarning"),
          content: warnings.map((w) => w.message).join(" "),
        });
      }
      message.success(t(`${dialog}Success`));
      onDone?.(data);
      onClose();
    },
    onError: (err) =>
      notification.error({
        title: t("actionError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      }),
  });

  const submit = () =>
    form
      .validateFields()
      .then((values) => run.mutate(values))
      .catch(() => {});

  const currencyMark = record?.currency?.symbol || record?.currency?.code || "";

  return (
    <Modal
      open={dialog != null}
      title={dialog ? t(`${dialog}Title`) : ""}
      okText={
        dialog === "cancel"
          ? t("actionCancelSchedule")
          : dialog === "recognize"
            ? t("actionRecognize")
            : t("actionReschedule")
      }
      okButtonProps={{ danger: dialog === "cancel", loading: run.isPending }}
      cancelText={t("drawerCancel")}
      onOk={submit}
      onCancel={onClose}
    >
      <Typography.Paragraph type="secondary">
        {dialog
          ? t(`${dialog}Help`, {
              remaining: formatTenantMoneyWithSymbol(
                record?.remaining_amount ?? 0,
                currencyMark,
              ),
            })
          : ""}
      </Typography.Paragraph>
      <Form form={form} layout="vertical">
        {dialog === "reschedule" ? (
          <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
            <Form.Item
              name="end_date"
              label={t("newEndDate")}
              rules={required(t("newEndDate"))}
            >
              <DatePicker className="w-full" format={dayjsDatePattern()} />
            </Form.Item>
            <Form.Item name="method" label={t("fieldMethod")}>
              <Select
                options={[
                  {
                    value: "straight_line_monthly",
                    label: t("method_straight_line_monthly"),
                  },
                  { value: "daily_prorata", label: t("method_daily_prorata") },
                ]}
              />
            </Form.Item>
          </div>
        ) : null}
        {dialog === "recognize" ? (
          <Form.Item
            name="date"
            label={t("recognizeDate")}
            rules={required(t("recognizeDate"))}
          >
            <DatePicker className="w-full" format={dayjsDatePattern()} />
          </Form.Item>
        ) : null}
        {dialog === "cancel" ? (
          <Form.Item
            name="reason"
            label={t("cancelReason")}
            rules={required(t("cancelReason"))}
          >
            <Input.TextArea rows={3} maxLength={500} />
          </Form.Item>
        ) : null}
      </Form>
    </Modal>
  );
}
