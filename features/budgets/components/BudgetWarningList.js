"use client";

import { useCompanySettings } from "@/lib/company-settings";
import { formatTenantMoneyWithSymbol } from "@/lib/tenant-format";
import { Alert } from "antd";
import { useTranslations } from "next-intl";
import { fetchBudgetWarnings } from "../api/budgets.api";

/**
 * Over-budget accounts: "6263 Rent — 2,350 of 1,000 (1,350 over)".
 *
 * @param {{ warnings: Record<string, any>[] }} props
 */
export default function BudgetWarningList({ warnings }) {
  const t = useTranslations("Budgets");
  const { settings } = useCompanySettings();
  if (!warnings.length) return null;
  const money = (value) =>
    formatTenantMoneyWithSymbol(
      value ?? 0,
      settings.primaryCurrencySymbol ?? "",
    );
  const scope = warnings[0]?.scope === "ytd" ? t("scopeYtd") : t("scopeMonth");
  return (
    <Alert
      type="warning"
      showIcon
      className="!mt-3"
      title={t("overBudgetTitle", { scope })}
      description={
        <ul className="!mb-0 ps-4">
          {warnings.map((w) => (
            <li key={w.account_id}>
              {t("overBudgetLine", {
                account: [w.account_code, w.account_name]
                  .filter(Boolean)
                  .join(" "),
                actual: money(w.actual_after),
                budget: money(w.budget),
                over: money(w.over_by),
              })}
            </li>
          ))}
        </ul>
      }
    />
  );
}

/**
 * Wraps a document's "Post" confirmation with the budget check.
 * Saved documents are checked before the confirm (the confirm then lists the warnings and says
 * "Post anyway"); new ones are checked right after posting and get a warning notification.
 * The check never blocks posting.
 *
 * @param {{
 *   source: "expense_voucher" | "purchase_invoice" | "journal_entry";
 *   id: string | null | undefined;
 *   modal: { confirm: (config: Record<string, any>) => unknown };
 *   notification: { warning: (config: Record<string, any>) => unknown };
 *   tBudgets: (key: string, values?: Record<string, unknown>) => string;
 *   confirm: Record<string, any>;
 *   post: () => Promise<any>;
 *   wrapConfirm?: (config: Record<string, any>) => Record<string, any>;
 * }} args
 */
export async function confirmPostWithBudgetCheck({
  source,
  id,
  modal,
  notification,
  tBudgets,
  confirm,
  post,
  wrapConfirm = (c) => c,
}) {
  const before = id ? await fetchBudgetWarnings(source, String(id)) : [];
  modal.confirm(
    wrapConfirm({
      ...confirm,
      width: before.length ? 560 : undefined,
      content: before.length ? (
        <div>
          {confirm.content}
          <BudgetWarningList warnings={before} />
        </div>
      ) : (
        confirm.content
      ),
      okText: before.length ? tBudgets("postAnyway") : confirm.okText,
      onOk: () =>
        post().then(async (posted) => {
          const postedId = posted?.id ?? id;
          if (id || !postedId) return posted;
          const after = await fetchBudgetWarnings(
            source,
            String(postedId),
            true,
          );
          if (after.length) {
            notification.warning({
              title: tBudgets("postedOverBudget"),
              description: <BudgetWarningList warnings={after} />,
              duration: 10,
            });
          }
          return posted;
        }),
    }),
  );
}

/**
 * For drawers that post without a confirm: posts straight away when nothing is over budget,
 * otherwise asks "Post anyway?" with the list. New documents are checked after posting.
 *
 * @param {{
 *   source: "expense_voucher" | "purchase_invoice" | "journal_entry";
 *   id: string | null | undefined;
 *   modal: { confirm: (config: Record<string, any>) => unknown };
 *   notification: { warning: (config: Record<string, any>) => unknown };
 *   tBudgets: (key: string, values?: Record<string, unknown>) => string;
 *   post: () => Promise<any>;
 * }} args
 */
export async function postWithBudgetWarning({
  source,
  id,
  modal,
  notification,
  tBudgets,
  post,
}) {
  const run = () =>
    post().then(async (posted) => {
      const postedId = posted?.id;
      if (id || !postedId) return posted;
      const after = await fetchBudgetWarnings(source, String(postedId), true);
      if (after.length) {
        notification.warning({
          title: tBudgets("postedOverBudget"),
          description: <BudgetWarningList warnings={after} />,
          duration: 10,
        });
      }
      return posted;
    });
  const before = id ? await fetchBudgetWarnings(source, String(id)) : [];
  if (!before.length) return run();
  modal.confirm({
    title: tBudgets("overBudgetConfirmTitle"),
    width: 560,
    content: <BudgetWarningList warnings={before} />,
    okText: tBudgets("postAnyway"),
    cancelText: tBudgets("cancel"),
    onOk: () => run(),
  });
  return undefined;
}
