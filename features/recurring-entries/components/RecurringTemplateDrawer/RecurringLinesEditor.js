"use client";

import { formatTenantMoneyWithSymbol } from "@/lib/tenant-format";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import LinesGrid from "@/shared/components/lines-grid/LinesGrid";
import ResourceDrawerPanelHeader from "@/shared/components/resource-drawer/ResourceDrawerPanelHeader";
import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import { Form, Input, Select, Typography } from "antd";
import { useMemo } from "react";
import { emptyLine } from "../../utils/recurringTemplateDrawerUtils";

/**
 * Template lines on the shared lines grid. Vouchers: account, description, amount, VAT.
 * Journal entries: account, description, debit, credit, with totals and the difference.
 *
 * @param {{
 *   form: import("antd").FormInstance;
 *   t: (key: string, values?: Record<string, unknown>) => string;
 *   readOnly: boolean;
 *   documentType: string;
 *   accountOptions: { value: number; label: string }[];
 *   accountsPending: boolean;
 *   vatOptions: { value: number; label: string }[];
 *   currencyMark: string;
 * }} props
 */
export default function RecurringLinesEditor({
  form,
  t,
  readOnly,
  documentType,
  accountOptions,
  accountsPending,
  vatOptions,
  currencyMark,
}) {
  const voucher = documentType === "expense_voucher";
  const watched = Form.useWatch("lines", { form, preserve: true });
  const lines = useMemo(
    () =>
      Array.isArray(watched) && watched.length > 0
        ? watched
        : [emptyLine(documentType)],
    [watched, documentType],
  );

  const columns = useMemo(
    () =>
      voucher
        ? [
            {
              key: "account_id",
              label: t("colAccount"),
              width: "minmax(220px, 2.2fr)",
            },
            {
              key: "description",
              label: t("colDescription"),
              width: "minmax(160px, 2fr)",
            },
            { key: "amount", label: t("colAmount"), width: "170px" },
            { key: "vat_group_id", label: t("colVat"), width: "160px" },
          ]
        : [
            {
              key: "account_id",
              label: t("colAccount"),
              width: "minmax(220px, 2.2fr)",
            },
            {
              key: "description",
              label: t("colDescription"),
              width: "minmax(160px, 2fr)",
            },
            { key: "debit", label: t("colDebit"), width: "150px" },
            { key: "credit", label: t("colCredit"), width: "150px" },
          ],
    [t, voucher],
  );

  const setLines = (next) =>
    form.setFieldValue(
      "lines",
      next.length > 0 ? next : [emptyLine(documentType)],
    );
  const sum = (key) =>
    lines.reduce((total, line) => total + (Number(line?.[key]) || 0), 0);
  const money = (value) => formatTenantMoneyWithSymbol(value, currencyMark);
  const debit = sum("debit");
  const credit = sum("credit");
  const difference = Math.round((debit - credit) * 10000) / 10000;

  const numberField = (index, key) => (
    <Form.Item name={["lines", index, key]} noStyle>
      <TenantNumberInput
        kind="money"
        min={0}
        style={{ width: "100%" }}
        disabled={readOnly}
        addonAfter={currencyMark || undefined}
      />
    </Form.Item>
  );

  return (
    <section>
      <ResourceDrawerPanelHeader
        title={t("sectionLines")}
        help={voucher ? t("linesVoucherHelp") : t("linesJournalHelp")}
      />
      <LinesGrid
        columns={columns}
        lines={lines}
        canAddLine={!readOnly}
        onAddLine={() => setLines([...lines, emptyLine(documentType)])}
        addLabel={t("addLine")}
        deleteAriaLabel={t("actionDelete")}
        onRemoveLine={(index) => setLines(lines.filter((_, i) => i !== index))}
        canRemoveLine={lines.length > (voucher ? 1 : 2)}
        readOnly={readOnly}
        renderField={(_line, index, columnKey) => {
          if (columnKey === "account_id") {
            return (
              <Form.Item
                name={["lines", index, "account_id"]}
                noStyle
                rules={[
                  {
                    required: true,
                    message: t("fieldRequired", { field: t("colAccount") }),
                  },
                ]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  className="w-full"
                  loading={accountsPending}
                  options={accountOptions}
                  placeholder={t("colAccount")}
                  disabled={readOnly}
                  getPopupContainer={drawerSelectGetPopup}
                />
              </Form.Item>
            );
          }
          if (columnKey === "description") {
            return (
              <Form.Item name={["lines", index, "description"]} noStyle>
                <Input
                  disabled={readOnly}
                  maxLength={500}
                  placeholder={t("lineDescriptionPlaceholder")}
                />
              </Form.Item>
            );
          }
          if (columnKey === "vat_group_id") {
            return (
              <Form.Item name={["lines", index, "vat_group_id"]} noStyle>
                <Select
                  allowClear
                  className="w-full"
                  options={vatOptions}
                  disabled={readOnly}
                  placeholder={t("noVat")}
                  getPopupContainer={drawerSelectGetPopup}
                />
              </Form.Item>
            );
          }
          return numberField(index, columnKey);
        }}
      />
      <div className="mt-3 flex flex-wrap justify-end gap-x-6 gap-y-1 text-sm">
        {voucher ? (
          <span>
            {t("colTotal")}:{" "}
            <strong className="tabular-nums">{money(sum("amount"))}</strong>
          </span>
        ) : (
          <>
            <span>
              {t("colDebit")}:{" "}
              <strong className="tabular-nums">{money(debit)}</strong>
            </span>
            <span>
              {t("colCredit")}:{" "}
              <strong className="tabular-nums">{money(credit)}</strong>
            </span>
            <Typography.Text type={difference === 0 ? "success" : "danger"}>
              {t("difference")}:{" "}
              <strong className="tabular-nums">{money(difference)}</strong>
            </Typography.Text>
          </>
        )}
      </div>
    </section>
  );
}
