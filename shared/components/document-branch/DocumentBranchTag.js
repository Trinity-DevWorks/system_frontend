"use client";

import { ApartmentOutlined } from "@ant-design/icons";
import { Tag, Tooltip } from "antd";
import { useTranslations } from "next-intl";
import { documentBranchName, useHasMultipleBranches } from "./useHasMultipleBranches";

/**
 * Read-only issuing branch of a saved document. The branch follows the warehouse (or the
 * active branch) and is frozen after posting, so it is shown rather than edited.
 *
 * @param {{ record?: Record<string, unknown> | null }} props
 */
export default function DocumentBranchTag({ record = null }) {
  const t = useTranslations("DocumentBranch");
  const multiple = useHasMultipleBranches();
  if (!multiple || !record || typeof record !== "object") return null;

  const from = documentBranchName(record.from_branch);
  const to = documentBranchName(record.to_branch);
  const single = documentBranchName(record.branch);

  if (from || to) {
    const label = from && to && from !== to ? `${from} \u2192 ${to}` : from || to;
    return (
      <Tooltip title={`${t("fromBranch")}: ${from || "\u2014"} \u00b7 ${t("toBranch")}: ${to || "\u2014"}`}>
        <Tag className="m-0" icon={<ApartmentOutlined />}>
          {label}
        </Tag>
      </Tooltip>
    );
  }

  if (!single) return null;

  return (
    <Tooltip title={t("branch")}>
      <Tag className="m-0" icon={<ApartmentOutlined />}>
        {single}
      </Tag>
    </Tooltip>
  );
}
