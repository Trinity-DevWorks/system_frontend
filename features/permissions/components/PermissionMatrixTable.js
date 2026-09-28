"use client";

import { QuestionCircleOutlined } from "@ant-design/icons";
import { Checkbox, Table, Tooltip, Typography } from "antd";
import { useMemo } from "react";
import {
  INVOICE_PROOFS_RESOURCE_KEY,
  PERM_FLAGS,
  allRowsCheckState,
  applyAllFlagsToRow,
  applyFlagToRow,
  columnCheckState,
  rowAllCheckState,
  rowAllowsFlag,
} from "../utils/permissionsMatrixUtils";

/**
 * @param {{
 *   rows: Array<Record<string, unknown>>;
 *   readOnly: boolean;
 *   search: string;
 *   invoiceProofsLocked?: boolean;
 *   onChange: (next: Array<Record<string, unknown>>) => void;
 *   t: (key: string, values?: Record<string, unknown>) => string;
 * }} props
 */
export default function PermissionMatrixTable({
  rows,
  readOnly,
  search,
  invoiceProofsLocked = false,
  onChange,
  t,
}) {
  const filteredRows = useMemo(() => {
    const q = String(search ?? "").trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const label = String(row.resource_label ?? "").toLowerCase();
      const key = String(row.resource_key ?? "").toLowerCase();
      return label.includes(q) || key.includes(q);
    });
  }, [rows, search]);

  const filteredIdSet = useMemo(
    () => new Set(filteredRows.map((r) => Number(r.permission_id))),
    [filteredRows],
  );

  const lockedIdSet = useMemo(() => {
    if (!invoiceProofsLocked) return new Set();
    return new Set(
      rows
        .filter((row) => String(row.resource_key ?? "") === INVOICE_PROOFS_RESOURCE_KEY)
        .map((row) => Number(row.permission_id)),
    );
  }, [invoiceProofsLocked, rows]);

  const editableFilteredRows = useMemo(
    () => filteredRows.filter((row) => !lockedIdSet.has(Number(row.permission_id))),
    [filteredRows, lockedIdSet],
  );

  const isRowLocked = (record) => lockedIdSet.has(Number(record.permission_id));

  const setFlag = (permissionId, flag, checked) => {
    if (readOnly || lockedIdSet.has(Number(permissionId))) return;
    onChange(
      rows.map((row) =>
        Number(row.permission_id) === Number(permissionId)
          ? applyFlagToRow(row, flag, checked)
          : row,
      ),
    );
  };

  const setFlagForFiltered = (flag, checked) => {
    if (readOnly) return;
    const next = rows.map((row) =>
      filteredIdSet.has(Number(row.permission_id)) && !lockedIdSet.has(Number(row.permission_id))
        ? applyFlagToRow(row, flag, checked)
        : row,
    );
    onChange(next);
  };

  const setAllForRow = (permissionId, checked) => {
    if (readOnly || lockedIdSet.has(Number(permissionId))) return;
    onChange(
      rows.map((row) =>
        Number(row.permission_id) === Number(permissionId)
          ? applyAllFlagsToRow(row, checked)
          : row,
      ),
    );
  };

  const setAllForFiltered = (checked) => {
    if (readOnly) return;
    onChange(
      rows.map((row) =>
        filteredIdSet.has(Number(row.permission_id)) && !lockedIdSet.has(Number(row.permission_id))
          ? applyAllFlagsToRow(row, checked)
          : row,
      ),
    );
  };

  const allHeaderState = allRowsCheckState(editableFilteredRows);

  /** @type {import("antd").TableProps<Record<string, unknown>>["columns"]} */
  const columns = [
    {
      title: t("colResource"),
      dataIndex: "resource_label",
      key: "resource",
      fixed: "start",
      width: 260,
      render: (label, record) => {
        const locked = isRowLocked(record);
        return (
          <div className="min-w-0 py-0.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate font-medium text-[var(--ant-color-text)]">
                {String(label ?? record.resource_key ?? "")}
              </span>
              {locked ? (
                <Tooltip title={t("invoiceProofsLockedHint")}>
                  <QuestionCircleOutlined
                    className="shrink-0 text-[var(--ant-color-text-secondary)]"
                    aria-label={t("invoiceProofsLockedHint")}
                  />
                </Tooltip>
              ) : null}
            </div>
            <Typography.Text type="secondary" className="text-xs">
              {String(record.resource_key ?? "")}
            </Typography.Text>
          </div>
        );
      },
    },
    {
      title: (
        <div className="flex flex-col items-center gap-1">
          <Checkbox
            checked={allHeaderState.checked}
            indeterminate={allHeaderState.indeterminate}
            disabled={readOnly || allHeaderState.applicableCount === 0}
            aria-label={t("selectAllMatrix")}
            onChange={(e) => setAllForFiltered(e.target.checked)}
          />
          <span className="text-xs font-medium whitespace-nowrap">{t("colAll")}</span>
        </div>
      ),
      key: "all",
      align: /** @type {const} */ ("center"),
      width: 72,
      render: (_value, record) => {
        const state = rowAllCheckState(record);
        if (state.applicableCount === 0) {
          return (
            <Typography.Text type="secondary" aria-label={t("actionNotApplicable")}>
              —
            </Typography.Text>
          );
        }
        return (
          <Checkbox
            checked={state.checked}
            indeterminate={state.indeterminate}
            disabled={readOnly || isRowLocked(record)}
            aria-label={t("selectAllRow", {
              resource: String(record.resource_label ?? record.resource_key ?? ""),
            })}
            onChange={(e) => setAllForRow(Number(record.permission_id), e.target.checked)}
          />
        );
      },
    },
    ...PERM_FLAGS.map((flag) => {
      const state = columnCheckState(editableFilteredRows, flag);
      return {
        title: (
          <div className="flex flex-col items-center gap-1">
            <Checkbox
              checked={state.checked}
              indeterminate={state.indeterminate}
              disabled={readOnly || state.applicableCount === 0}
              aria-label={t("selectAllAction", { action: t(`action_${flag}`) })}
              onChange={(e) => setFlagForFiltered(flag, e.target.checked)}
            />
            <span className="text-xs font-medium whitespace-nowrap">
              {t(`action_${flag}`)}
            </span>
          </div>
        ),
        key: flag,
        dataIndex: flag,
        align: /** @type {const} */ ("center"),
        width: 88,
        render: (value, record) =>
          rowAllowsFlag(record, flag) ? (
            <Checkbox
              checked={Boolean(value)}
              disabled={readOnly || isRowLocked(record)}
              aria-label={`${String(record.resource_label ?? record.resource_key)} — ${t(`action_${flag}`)}`}
              onChange={(e) =>
                setFlag(Number(record.permission_id), flag, e.target.checked)
              }
            />
          ) : (
            <Typography.Text type="secondary" aria-label={t("actionNotApplicable")}>
              —
            </Typography.Text>
          ),
      };
    }),
  ];

  return (
    <Table
      size="middle"
      rowKey={(r) => String(r.permission_id)}
      columns={columns}
      dataSource={filteredRows}
      pagination={false}
      sticky
      scroll={{ x: 1100, y: "calc(100dvh - 14rem)" }}
      locale={{ emptyText: t("emptyMatrix") }}
      className="permissions-matrix-table min-w-0"
    />
  );
}
