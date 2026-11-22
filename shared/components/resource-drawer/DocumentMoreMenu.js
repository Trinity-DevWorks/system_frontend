"use client";

import { DownOutlined, FilePdfOutlined, MailOutlined, PrinterOutlined } from "@ant-design/icons";
import { Button, Dropdown } from "antd";
import { useTranslations } from "next-intl";

/**
 * @typedef {{
 *   key: string;
 *   label: import("react").ReactNode;
 *   icon?: import("react").ReactNode;
 *   onClick: () => void;
 *   disabled?: boolean;
 *   danger?: boolean;
 * }} MoreItem
 */

/**
 * "More ▾" button for document drawer footers: the secondary actions (Print, Download PDF,
 * Email…) live here so the footer keeps one clear primary action.
 * Renders nothing when there are no items.
 *
 * @param {{
 *   items: (MoreItem | null | false | undefined)[];
 *   disabled?: boolean;
 *   loading?: boolean;
 * }} props
 */
export default function DocumentMoreMenu({ items, disabled = false, loading = false }) {
  const t = useTranslations("DrawerActions");
  const list = /** @type {MoreItem[]} */ (items.filter(Boolean));
  if (list.length === 0) return null;

  const byKey = new Map(list.map((item) => [item.key, item]));
  return (
    <Dropdown
      trigger={["click"]}
      disabled={disabled}
      menu={{
        items: list.map(({ key, label, icon, disabled: itemDisabled, danger }) => ({
          key,
          label,
          icon,
          disabled: itemDisabled,
          danger,
        })),
        onClick: ({ key }) => byKey.get(String(key))?.onClick(),
      }}
    >
      <Button className="shrink-0" disabled={disabled} loading={loading}>
        {t("more")} <DownOutlined />
      </Button>
    </Dropdown>
  );
}

/**
 * The usual Print / Download PDF / Email items. Pass only the handlers the document supports.
 *
 * @param {{
 *   t: (key: string) => string;
 *   onPrint?: (() => void) | null;
 *   onDownloadPdf?: (() => void) | null;
 *   onEmail?: (() => void) | null;
 *   emailLabel?: string;
 *   disabled?: boolean;
 * }} options  `t` is the document's namespace (it has actionPrint / actionDownloadPdf).
 * @returns {MoreItem[]}
 */
export function documentOutputItems({ t: tDocument, onPrint, onDownloadPdf, onEmail, emailLabel, disabled = false }) {
  return [
    onPrint ? { key: "print", icon: <PrinterOutlined />, label: tDocument("actionPrint"), onClick: onPrint, disabled } : null,
    onDownloadPdf
      ? { key: "pdf", icon: <FilePdfOutlined />, label: tDocument("actionDownloadPdf"), onClick: onDownloadPdf, disabled }
      : null,
    onEmail ? { key: "email", icon: <MailOutlined />, label: emailLabel, onClick: onEmail, disabled } : null,
  ].filter((item) => item !== null);
}
