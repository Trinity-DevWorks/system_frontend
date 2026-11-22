"use client";

import { useCompanySettings } from "@/lib/company-settings";
import {
  formatTenantMoney,
  formatTenantMoneyWithSymbol,
} from "@/lib/tenant-format";
import {
  CaretDownOutlined,
  CaretRightOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import {
  Button,
  Dropdown,
  Empty,
  Input,
  Space,
  Switch,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";

/** @param {unknown} value */
const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
/** Two decimals, no float dust. @param {number} value */
const round2 = (value) => Math.round(value * 100) / 100;

/**
 * One editable amount: plain text while not focused (formatted), raw number while typing.
 *
 * @param {{ value: number; changed: boolean; readOnly: boolean; row: number; col: number; onChange: (value: number) => void }} props
 */
function AmountCell({ value, changed, readOnly, row, col, onChange }) {
  const [draft, setDraft] = useState(/** @type {string | null} */ (null));
  if (readOnly) {
    return (
      <span className="block px-2 text-end tabular-nums">
        {value ? formatTenantMoney(value) : ""}
      </span>
    );
  }
  const move = (event, dRow) => {
    const next = document.querySelector(
      `[data-budget-cell="${row + dRow}:${col}"]`,
    );
    if (next instanceof HTMLInputElement) {
      event.preventDefault();
      next.focus();
      next.select();
    }
  };
  return (
    <input
      data-budget-cell={`${row}:${col}`}
      inputMode="decimal"
      className={[
        "w-full rounded border border-solid border-transparent bg-transparent px-2 py-1 text-end tabular-nums outline-none",
        "hover:border-[var(--ant-color-border)] focus:border-[var(--ant-color-primary)] focus:bg-[var(--ant-color-bg-container)]",
        changed ? "!bg-[var(--ant-color-warning-bg)]" : "",
      ].join(" ")}
      value={draft ?? (value ? formatTenantMoney(value) : "")}
      onFocus={(event) => {
        setDraft(value ? String(value) : "");
        requestAnimationFrame(() => event.target.select());
      }}
      onChange={(event) => setDraft(event.target.value.replace(/[^\d.-]/g, ""))}
      onBlur={() => {
        // Only a different number is a change; focusing and leaving a cell changes nothing.
        if (draft !== null) {
          const next = round2(num(draft));
          if (next !== round2(num(value))) onChange(next);
        }
        setDraft(null);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown" || event.key === "Enter") move(event, 1);
        if (event.key === "ArrowUp") move(event, -1);
        if (event.key === "Escape") {
          setDraft(null);
          event.currentTarget.blur();
        }
      }}
    />
  );
}

/**
 * Accounts × 12 months. Group rows are read-only totals of their accounts and update while typing.
 *
 * @param {{
 *   t: (key: string, values?: Record<string, unknown>) => string;
 *   months: string[];
 *   rows: Record<string, any>[];
 *   edits: Record<string, number>;
 *   readOnly: boolean;
 *   onEdit: (accountId: number, month: string, value: number) => void;
 *   onRowAction: (action: "spread" | "percent" | "clear", row: Record<string, any>) => void;
 *   toolbar?: import("react").ReactNode;
 * }} props
 */
export default function BudgetGrid({
  t,
  months,
  rows,
  edits,
  readOnly,
  onEdit,
  onRowAction,
  toolbar,
}) {
  const [search, setSearch] = useState("");
  const [onlyWithAmounts, setOnlyWithAmounts] = useState(false);
  // Groups the user opened (false) or closed (true); others use the default below.
  const [toggled, setToggled] = useState(
    /** @type {Record<number, boolean>} */ ({}),
  );

  const cellValue = (row, month) => {
    const key = `${row.account_id}|${month}`;
    return key in edits ? edits[key] : num(row.amounts?.[month]);
  };

  // Children of each account, to roll edited leaf amounts up into their groups.
  const { childrenOf, leavesOf } = useMemo(() => {
    const children = new Map();
    rows.forEach((row) => {
      if (row.parent_id == null) return;
      if (!children.has(row.parent_id)) children.set(row.parent_id, []);
      children.get(row.parent_id).push(row);
    });
    const leaves = new Map();
    const collect = (row) => {
      if (leaves.has(row.account_id)) return leaves.get(row.account_id);
      const kids = children.get(row.account_id) ?? [];
      const out =
        kids.length === 0
          ? row.is_postable
            ? [row]
            : []
          : kids.flatMap(collect);
      leaves.set(row.account_id, out);
      return out;
    };
    rows.forEach(collect);
    return { childrenOf: children, leavesOf: leaves };
  }, [rows]);

  const amountsOf = (row) => {
    if (row.is_postable) return months.map((month) => cellValue(row, month));
    const leaves = leavesOf.get(row.account_id) ?? [];
    return months.map((month) =>
      round2(leaves.reduce((sum, leaf) => sum + cellValue(leaf, month), 0)),
    );
  };

  // Default view: two levels. Level 1 groups are open; deeper groups are closed unless
  // they already hold amounts (so existing figures are visible straight away).
  const groupIds = rows
    .filter((row) => (childrenOf.get(row.account_id) ?? []).length > 0)
    .map((row) => row.account_id);
  const isCollapsed = (row) => {
    if (row == null || !(childrenOf.get(row.account_id) ?? []).length)
      return false;
    if (row.account_id in toggled) return toggled[row.account_id];
    if (Number(row.level ?? 1) < 2) return false;
    return !amountsOf(row).some((value) => value !== 0);
  };
  const setAll = (closed) =>
    setToggled(
      Object.fromEntries(
        groupIds.map((id) => {
          const row = rows.find((r) => r.account_id === id);
          // "Collapse all" goes back to two levels: level 1 stays open.
          return [id, closed ? Number(row?.level ?? 1) >= 2 : false];
        }),
      ),
    );

  // Hide rows under a collapsed group, rows not matching the search, and (optionally) empty rows.
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    const byId = new Map(rows.map((row) => [row.account_id, row]));
    const hiddenByCollapse = (row) => {
      // While searching, show every match with its path, whatever is collapsed.
      if (query) return false;
      let parent = row.parent_id;
      let guard = 0;
      while (parent != null && guard++ < 32) {
        if (isCollapsed(byId.get(parent))) return true;
        parent = byId.get(parent)?.parent_id ?? null;
      }
      return false;
    };
    const matches = (row) =>
      !query || `${row.code} ${row.name}`.toLowerCase().includes(query);
    const hasAmounts = (row) => amountsOf(row).some((value) => value !== 0);
    // A group stays visible when any account under it is visible.
    const keep = new Set();
    rows.forEach((row) => {
      if (!row.is_postable) return;
      if (!matches(row) || (onlyWithAmounts && !hasAmounts(row))) return;
      keep.add(row.account_id);
      let parent = row.parent_id;
      let guard = 0;
      while (parent != null && guard++ < 32) {
        keep.add(parent);
        parent = byId.get(parent)?.parent_id ?? null;
      }
    });
    return rows.filter(
      (row) => keep.has(row.account_id) && !hiddenByCollapse(row),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, search, onlyWithAmounts, toggled, edits]);

  const grandTotals = useMemo(() => {
    const top = rows.filter((row) => row.parent_id == null);
    return {
      revenue: top
        .filter((row) => row.type === "revenue")
        .reduce(
          (sum, row) => sum + amountsOf(row).reduce((a, b) => a + b, 0),
          0,
        ),
      expense: top
        .filter((row) => row.type === "expense")
        .reduce(
          (sum, row) => sum + amountsOf(row).reduce((a, b) => a + b, 0),
          0,
        ),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, edits]);

  // Primary currency symbol on the totals line and the Total column (month cells stay plain).
  const { settings } = useCompanySettings();
  const symbol = settings.primaryCurrencySymbol ?? "";
  const money = (value) => formatTenantMoneyWithSymbol(value, symbol);
  const gridTemplate = `minmax(260px, 1fr) repeat(${months.length}, minmax(96px, 110px)) minmax(110px, 120px) 40px`;

  return (
    // Fills the drawer body (see .budget-grid-fill in drawers.css); only the grid scrolls.
    <div className="budget-grid-fill flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Input.Search
          allowClear
          className="!w-64"
          placeholder={t("searchAccounts")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <Switch
            size="small"
            checked={onlyWithAmounts}
            onChange={setOnlyWithAmounts}
          />
          {t("onlyWithAmounts")}
        </label>
        <Space size={4}>
          <Button size="small" onClick={() => setAll(false)}>
            {t("expandAll")}
          </Button>
          <Button size="small" onClick={() => setAll(true)}>
            {t("collapseAll")}
          </Button>
        </Space>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          {toolbar}
        </div>
      </div>


      <div className="min-h-0 flex-initial overflow-auto rounded-md border border-solid border-[var(--ant-color-border-secondary)]">
        <div className="min-w-max">
          <div
            className="sticky top-0 z-10 grid border-b border-solid border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-fill-quaternary)] text-xs font-semibold backdrop-blur"
            style={{ gridTemplateColumns: gridTemplate }}
          >
            <div className="sticky start-0 z-10 bg-[var(--ant-color-bg-container)] px-3 py-2">
              {t("colAccount")}
            </div>
            {months.map((month) => (
              <div key={month} className="px-2 py-2 text-end">
                {dayjs(month).format("MMM YY")}
              </div>
            ))}
            {/* Year total and row actions stay pinned to the end while scrolling through the months. */}
            <div className="sticky end-[40px] z-10 border-s border-solid border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)] px-2 py-2 text-end">
              {symbol ? `${t("colTotal")} (${symbol})` : t("colTotal")}
            </div>
            <div className="sticky end-0 z-10 self-stretch border-s border-solid border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)]" />
          </div>

          {visible.length === 0 ? (
            <Empty className="!my-10" description={t("gridEmpty")} />
          ) : (
            visible.map((row, rowIndex) => {
              const values = amountsOf(row);
              const total = round2(values.reduce((a, b) => a + b, 0));
              const group = !row.is_postable;
              const hasChildren =
                (childrenOf.get(row.account_id) ?? []).length > 0;
              return (
                <div
                  key={row.account_id}
                  className={[
                    "grid items-center border-b border-solid border-[var(--ant-color-border-secondary)] text-sm",
                    group
                      ? "bg-[var(--ant-color-fill-quaternary)] font-semibold"
                      : "hover:bg-[var(--ant-color-fill-tertiary)]",
                  ].join(" ")}
                  style={{ gridTemplateColumns: gridTemplate }}
                >
                  <div
                    className="sticky start-0 flex min-w-0 items-center gap-1 bg-inherit py-1 pe-2"
                    style={{
                      paddingInlineStart: 8 + (Number(row.level ?? 1) - 1) * 16,
                      background: "var(--ant-color-bg-container)",
                    }}
                  >
                    {hasChildren ? (
                      <Button
                        type="text"
                        size="small"
                        className="!h-6 !w-6 !min-w-6"
                        icon={
                          isCollapsed(row) ? (
                            <CaretRightOutlined />
                          ) : (
                            <CaretDownOutlined />
                          )
                        }
                        aria-label={
                          isCollapsed(row) ? t("expand") : t("collapse")
                        }
                        onClick={() =>
                          setToggled((state) => ({
                            ...state,
                            [row.account_id]: !isCollapsed(row),
                          }))
                        }
                      />
                    ) : (
                      <span className="inline-block w-6" />
                    )}
                    <Typography.Text
                      type="secondary"
                      className="shrink-0 tabular-nums"
                    >
                      {row.code}
                    </Typography.Text>
                    <span className="truncate" title={row.name}>
                      {row.name}
                    </span>
                  </div>
                  {months.map((month, col) =>
                    group ? (
                      <span key={month} className="px-2 text-end tabular-nums">
                        {values[col] ? formatTenantMoney(values[col]) : ""}
                      </span>
                    ) : (
                      <AmountCell
                        key={month}
                        value={values[col]}
                        changed={`${row.account_id}|${month}` in edits}
                        readOnly={readOnly}
                        row={rowIndex}
                        col={col}
                        onChange={(value) =>
                          onEdit(row.account_id, month, value)
                        }
                      />
                    ),
                  )}
                  <span
                    className="sticky end-[40px] flex items-center justify-end self-stretch border-s border-solid border-[var(--ant-color-border-secondary)] px-2 font-semibold tabular-nums"
                    style={{ background: "var(--ant-color-bg-container)" }}
                  >
                    {total ? money(total) : ""}
                  </span>
                  <div
                    className="sticky end-0 flex items-center justify-center self-stretch border-s border-solid border-[var(--ant-color-border-secondary)]"
                    style={{ background: "var(--ant-color-bg-container)" }}
                  >
                    {!group && !readOnly ? (
                      <Dropdown
                        trigger={["click"]}
                        menu={{
                          items: [
                            { key: "spread", label: t("rowSpread") },
                            { key: "percent", label: t("rowPercent") },
                            { type: "divider" },
                            {
                              key: "clear",
                              label: t("rowClear"),
                              danger: true,
                            },
                          ],
                          onClick: ({ key }) =>
                            onRowAction(
                              /** @type {"spread" | "percent" | "clear"} */ (
                                key
                              ),
                              row,
                            ),
                        }}
                      >
                        <Button
                          type="text"
                          size="small"
                          icon={<MoreOutlined />}
                          aria-label={t("rowActions")}
                        />
                      </Dropdown>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      {/* Year totals under the grid. */}
      <div className="flex shrink-0 flex-wrap gap-x-6 gap-y-1 text-sm">
        <span>
          {t("totalRevenue")}:{" "}
          <strong className="tabular-nums">
            {money(round2(grandTotals.revenue))}
          </strong>
        </span>
        <span>
          {t("totalExpense")}:{" "}
          <strong className="tabular-nums">
            {money(round2(grandTotals.expense))}
          </strong>
        </span>
        <span>
          {t("netResult")}:{" "}
          <strong className="tabular-nums">
            {money(round2(grandTotals.revenue - grandTotals.expense))}
          </strong>
        </span>
      </div>
    </div>
  );
}
