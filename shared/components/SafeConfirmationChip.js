"use client";

import { Popover, Tag } from "antd";

/**
 * @param {unknown} address
 */
function shortAddress(address) {
  const raw = String(address ?? "").trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) return "";
  return `${raw.slice(0, 6)}…${raw.slice(-4)}`;
}

/**
 * Compact Safe confirmation count. Owners list is in the popover.
 *
 * @param {{
 *   t: (key: string, values?: Record<string, string | number>) => string;
 *   queue: import("@/lib/safe-company-approval-queue").SafeCompanyApprovalQueue | null | undefined;
 * }} props
 */
export default function SafeConfirmationChip({ t, queue }) {
  if (!queue?.safeTxHash || !queue?.owners?.length) return null;
  const confirmedSet = new Set(queue.confirmed.map((owner) => owner.toLowerCase()));
  const connected = String(queue.connected ?? "").toLowerCase();

  return (
    <Popover
      trigger={["hover", "click"]}
      placement="bottom"
      content={
        <ul className="sales-invoice-drawer-safe-queue-owners">
          {queue.owners.map((owner) => {
            const isYou = connected !== "" && owner.toLowerCase() === connected;
            const done = confirmedSet.has(owner.toLowerCase());
            const label = shortAddress(owner) || owner;
            return (
              <li key={owner.toLowerCase()}>
                <span dir="ltr">{label}</span>
                {isYou ? ` ${t("safeYou")}` : ""}
                {" — "}
                {done ? t("safeOwnerConfirmed") : t("safeOwnerWaiting")}
              </li>
            );
          })}
        </ul>
      }
    >
      <Tag className="m-0 cursor-pointer" color={queue.readyToExecute ? "gold" : "orange"}>
        {t("safeConfirmationsProgress", {
          confirmed: queue.confirmed.length,
          required: queue.threshold,
        })}
      </Tag>
    </Popover>
  );
}
