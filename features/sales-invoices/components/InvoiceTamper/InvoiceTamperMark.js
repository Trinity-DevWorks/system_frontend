"use client";

import { describeTamper, tamperFieldSentence } from "../../utils/invoiceProofStatuses";
import { WarningOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import { createContext, useContext, useMemo } from "react";

/** @type {import("react").Context<{ paths: Set<string>, labels: Record<string, string>, t: (key: string, values?: Record<string, string | number>) => string } | null>} */
const InvoiceTamperContext = createContext(null);

/**
 * @param {{
 *   paths?: string[];
 *   labels?: Record<string, string>;
 *   t: (key: string, values?: Record<string, string | number>) => string;
 *   children: import("react").ReactNode;
 * }} props
 */
export function InvoiceTamperProvider({ paths = [], labels = {}, t, children }) {
  const pathKey = paths.join("\n");
  const value = useMemo(() => {
    return {
      paths: new Set(pathKey === "" ? [] : pathKey.split("\n")),
      labels,
      t,
    };
  }, [pathKey, labels, t]);

  return <InvoiceTamperContext.Provider value={value}>{children}</InvoiceTamperContext.Provider>;
}

/**
 * @param {string | undefined} path
 * @param {string[] | undefined} paths
 * @param {{ paths: Set<string> } | null} ctx
 */
function matchedTamperPaths(path, paths, ctx) {
  const wanted = path ? [path] : Array.isArray(paths) ? paths : [];
  const hits = [];
  if (ctx) {
    for (const item of wanted) {
      if (ctx.paths.has(item)) hits.push(item);
      for (const known of ctx.paths) {
        if (known.startsWith(`${item}.`)) hits.push(known);
      }
    }
  }
  return [...new Set(hits)];
}

/**
 * Warning icon when one of these sealed paths was changed.
 * With children, the icon sits beside them. Without a match, children render unchanged.
 *
 * @param {{
 *   path?: string;
 *   paths?: string[];
 *   children?: import("react").ReactNode;
 * }} props
 */
export function TamperFieldWarning({ path, paths, children = null }) {
  const ctx = useContext(InvoiceTamperContext);
  const unique = matchedTamperPaths(path, paths, ctx);
  if (!ctx || unique.length === 0) return children;
  const title =
    unique.length === 1
      ? tamperFieldSentence(ctx.t, ctx.labels, unique[0])
      : describeTamper(ctx.t, ctx.labels, "snapshot", unique);

  const icon = (
    <Tooltip title={title}>
      <WarningOutlined className="shrink-0 text-[#ff4d4f]" aria-label={title} />
    </Tooltip>
  );

  if (children == null) return icon;
  return (
    <span className="invoice-tamper-field inline-flex w-full min-w-0 items-center gap-1">
      <span className="min-w-0 flex-1">{children}</span>
      {icon}
    </span>
  );
}

/**
 * @param {{ path?: string, paths?: string[], children: import("react").ReactNode }} props
 */
export function TamperBesideLabel({ path, paths, children }) {
  const ctx = useContext(InvoiceTamperContext);
  const matched = matchedTamperPaths(path, paths, ctx).length > 0;
  return (
    <span className={`${matched ? "invoice-tamper-label " : ""}inline-flex max-w-full items-center gap-1`}>
      {children}
      <TamperFieldWarning path={path} paths={paths} />
    </span>
  );
}
