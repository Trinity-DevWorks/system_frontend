"use client";

import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import LinesGrid from "@/shared/components/lines-grid/LinesGrid";
import ResourceDrawerPanelHeader from "@/shared/components/resource-drawer/ResourceDrawerPanelHeader";
import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import {
  Checkbox,
  DatePicker,
  Form,
  Input,
  Select,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useGlobalDrawer } from "@/lib/drawer/GlobalDrawerContext";
import {
  dayjsDatePattern,
  formatTenantMoneyWithSymbol,
} from "@/lib/tenant-format";
import { useMemo } from "react";
import { getEmptyExpenseLine } from "../../utils/expenseVoucherDrawerUtils";

/**
 * Expense lines on the shared lines grid (same look as the other document drawers).
 * The lines stay in the form under `lines`, so validation and the save payload are unchanged.
 *
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   expenseOptions: { value: number; label: string }[];
 *   assetOptions?: { value: number; label: string }[];
 *   prepaidAccountId?: number | null;
 *   expenseAccountsPending: boolean;
 *   vatOptions: { value: number; label: string }[];
 *   currencyMark?: string;
 * }} props
 */
export default function ExpenseVoucherLineEditor({
  form,
  readOnly,
  t,
  expenseOptions,
  assetOptions = [],
  prepaidAccountId = null,
  expenseAccountsPending,
  vatOptions,
  currencyMark = "",
}) {
  const { openStackedDrawer } = useGlobalDrawer();
  // `preserve` reads the stored lines even though `lines` itself has no input of its own.
  const watched = Form.useWatch("lines", { form, preserve: true });
  const lines = useMemo(
    () =>
      Array.isArray(watched) && watched.length > 0
        ? watched
        : [getEmptyExpenseLine()],
    [watched],
  );

  const columns = useMemo(
    () => [
      {
        key: "account_id",
        label: t("colExpenseAccount"),
        width: "minmax(220px, 2.2fr)",
      },
      {
        key: "description",
        label: t("colDescription"),
        width: "minmax(160px, 2fr)",
      },
      { key: "amount", label: t("colAmount"), width: "170px" },
      { key: "vat_group_id", label: t("colVat"), width: "160px" },
      { key: "spread", label: t("spreadOverTime"), width: "140px" },
    ],
    [t],
  );

  const setLines = (next) =>
    form.setFieldValue(
      "lines",
      next.length > 0 ? next : [getEmptyExpenseLine()],
    );

  return (
    <section className="item-lines-panel">
      <ResourceDrawerPanelHeader title={t("sectionLines")} />
      <LinesGrid
        columns={columns}
        lines={lines}
        canAddLine={!readOnly}
        onAddLine={() => setLines([...lines, getEmptyExpenseLine()])}
        addLabel={t("addLine")}
        deleteAriaLabel={t("actionDelete")}
        onRemoveLine={(index) => setLines(lines.filter((_, i) => i !== index))}
        canRemoveLine={lines.length > 1}
        readOnly={readOnly}
        renderRowDetail={(_line, index) => {
          const line = lines[index] ?? {};
          if (!line.spread) return null;
          const period = Array.isArray(line.deferral_period)
            ? line.deferral_period
            : null;
          const months =
            period?.[0] && period?.[1]
              ? Math.max(
                  1,
                  dayjs(period[1]).diff(dayjs(period[0]), "month") + 1,
                )
              : 0;
          const amount = Number(line.amount) || 0;
          const schedule = line.deferral_schedule;
          return (
            <div className="grid grid-cols-1 items-center gap-x-4 gap-y-1.5 md:grid-cols-3">
              <Form.Item
                name={["lines", index, "deferral_period"]}
                noStyle
                rules={[{ required: true, message: t("spreadPeriod") }]}
              >
                <DatePicker.RangePicker
                  className="w-full"
                  format={dayjsDatePattern()}
                  disabled={readOnly}
                  placeholder={[t("spreadFrom"), t("spreadTo")]}
                />
              </Form.Item>
              <Form.Item
                name={["lines", index, "deferral_recognition_account_id"]}
                noStyle
                rules={[{ required: true, message: t("spreadAccount") }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={expenseOptions}
                  placeholder={t("spreadAccount")}
                  disabled={readOnly}
                  getPopupContainer={drawerSelectGetPopup}
                />
              </Form.Item>
              <Form.Item name={["lines", index, "deferral_method"]} noStyle>
                <Select
                  options={[
                    {
                      value: "straight_line_monthly",
                      label: t("spreadMethodMonthly"),
                    },
                    { value: "daily_prorata", label: t("spreadMethodDaily") },
                  ]}
                  disabled={readOnly}
                  getPopupContainer={drawerSelectGetPopup}
                />
              </Form.Item>
              {months > 0 && amount > 0 ? (
                <Typography.Text type="secondary" className="text-xs">
                  {t("spreadHintMonths", {
                    amount: formatTenantMoneyWithSymbol(
                      amount / months,
                      currencyMark,
                    ),
                    months,
                  })}
                </Typography.Text>
              ) : null}
              {schedule?.id ? (
                <Tag
                  color="blue"
                  className="w-fit cursor-pointer"
                  onClick={() =>
                    openStackedDrawer({
                      featureId: "deferralSchedules",
                      id: String(schedule.id),
                      mode: "view",
                    })
                  }
                >
                  {schedule.schedule_number || t("spreadSchedule")}
                </Tag>
              ) : null}
            </div>
          );
        }}
        renderField={(_line, index, columnKey) => {
          if (columnKey === "spread") {
            return (
              <div className="flex h-8 items-center">
                <Form.Item
                  name={["lines", index, "spread"]}
                  valuePropName="checked"
                  noStyle
                >
                  <Checkbox
                    disabled={readOnly}
                    onChange={(e) => {
                      // A spread line is paid into a prepaid (asset) account; a normal line uses an expense account.
                      // Set only this line's account, after the form has stored the checkbox value.
                      const checked = e.target.checked;
                      setTimeout(
                        () =>
                          form.setFieldValue(
                            ["lines", index, "account_id"],
                            checked
                              ? (prepaidAccountId ?? undefined)
                              : undefined,
                          ),
                        0,
                      );
                    }}
                    // The column header already says "Spread over time".
                    aria-label={t("spreadOverTime")}
                  />
                </Form.Item>
              </div>
            );
          }
          if (columnKey === "account_id") {
            const spread = Boolean(lines[index]?.spread);
            return (
              <Form.Item
                name={["lines", index, "account_id"]}
                noStyle
                rules={[
                  { required: true, message: t("fieldExpenseAccountRequired") },
                ]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  className="w-full"
                  loading={expenseAccountsPending}
                  options={spread ? assetOptions : expenseOptions}
                  placeholder={t("colExpenseAccount")}
                  disabled={readOnly}
                  getPopupContainer={drawerSelectGetPopup}
                />
              </Form.Item>
            );
          }
          if (columnKey === "description") {
            return (
              <Form.Item name={["lines", index, "description"]} noStyle>
                <Input disabled={readOnly} maxLength={255} />
              </Form.Item>
            );
          }
          if (columnKey === "amount") {
            return (
              <Form.Item
                name={["lines", index, "amount"]}
                noStyle
                rules={[{ required: true, message: t("fieldAmountRequired") }]}
              >
                <TenantNumberInput
                  kind="money"
                  min={0}
                  className="w-full"
                  disabled={readOnly}
                  addonAfter={currencyMark || undefined}
                />
              </Form.Item>
            );
          }
          return (
            <Form.Item name={["lines", index, "vat_group_id"]} noStyle>
              <Select
                allowClear
                className="w-full"
                options={vatOptions}
                disabled={readOnly}
                getPopupContainer={drawerSelectGetPopup}
              />
            </Form.Item>
          );
        }}
      />
    </section>
  );
}
