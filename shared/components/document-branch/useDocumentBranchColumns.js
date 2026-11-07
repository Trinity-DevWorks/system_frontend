"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { documentBranchName, useHasMultipleBranches } from "./useHasMultipleBranches";

const INSERT_BEFORE = ["created_at", "actions"];

/**
 * @param {string} title
 * @param {string} key
 * @param {string} field
 */
function branchColumn(title, key, field) {
  return {
    title,
    key,
    width: 150,
    ellipsis: true,
    sorter: (a, b) => documentBranchName(a?.[field]).localeCompare(documentBranchName(b?.[field])),
    render: (_, record) => documentBranchName(record?.[field]) || "\u2014",
  };
}

/**
 * Adds the stored document branch to a list (docs/printing-plan.md D3.6). Shown only when the
 * user has more than one branch. Placed before "created at" / actions when those columns exist.
 *
 * @template {Record<string, unknown>} C
 * @param {C[]} columns
 * @param {{ transfer?: boolean }} [options]
 * @returns {C[]}
 */
export function useDocumentBranchColumns(columns, options = {}) {
  const t = useTranslations("DocumentBranch");
  const multiple = useHasMultipleBranches();
  const transfer = Boolean(options.transfer);

  return useMemo(() => {
    if (!multiple) return columns;
    const added = transfer
      ? [
          branchColumn(t("fromBranch"), "from_branch", "from_branch"),
          branchColumn(t("toBranch"), "to_branch", "to_branch"),
        ]
      : [branchColumn(t("branch"), "branch", "branch")];
    const index = columns.findIndex((column) =>
      INSERT_BEFORE.includes(String(column?.key ?? column?.dataIndex ?? "")),
    );
    const at = index >= 0 ? index : columns.length;

    return /** @type {C[]} */ ([...columns.slice(0, at), ...added, ...columns.slice(at)]);
  }, [columns, multiple, transfer, t]);
}
