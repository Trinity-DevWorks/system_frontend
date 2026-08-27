"use client";

/**
 * Single notification row matching the enterprise inbox mock.
 *
 * What: Icon + title/body + relative time + unread dot layout.
 * Used for: NotificationBell popover and /main/notifications page.
 * Solves: One consistent row design so the popover and full inbox look the same.
 */

import {
  formatNotificationBody,
  formatNotificationTime,
  formatNotificationTitle,
  notificationVisual,
} from "@/shell/header/notificationFormat";
import { theme } from "antd";
import { useLocale, useMessages, useTranslations } from "next-intl";

/**
 * @param {{
 *   notification: Record<string, unknown>,
 *   onClick?: (row: Record<string, unknown>) => void,
 *   showDivider?: boolean,
 * }} props
 */
export default function NotificationListItem({
  notification,
  onClick,
  showDivider = true,
}) {
  const t = useTranslations("Notifications");
  const messages = useMessages();
  const locale = useLocale();
  const { token } = theme.useToken();

  const title = formatNotificationTitle(notification, t, messages);
  const body = formatNotificationBody(notification, t, messages);
  const timeLabel = formatNotificationTime(
    /** @type {string | undefined} */ (notification.created_at),
    locale,
  );
  const { Icon, accent, iconBg } = notificationVisual(notification, token);
  const isUnread = !notification.read;

  return (
    <li>
      <button
        type="button"
        onClick={() => onClick?.(notification)}
        className="flex w-full items-center gap-3 border-0 px-4 py-3 text-start transition-colors"
        style={{
          background: "transparent",
          cursor: "pointer",
          color: "inherit",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = token.colorFillTertiary;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        <span
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ background: iconBg, color: accent }}
        >
          <Icon style={{ fontSize: 16 }} />
        </span>

        <span className="min-w-0 flex-1">
          <span
            className="block truncate text-[13px] leading-5"
            style={{
              color: token.colorText,
              fontWeight: isUnread ? 600 : 500,
            }}
          >
            {title}
          </span>
          <span
            className="mt-0.5 block line-clamp-1 text-xs leading-4"
            style={{ color: token.colorTextSecondary }}
          >
            {body}
          </span>
        </span>

        <span className="flex shrink-0 flex-col items-end gap-2 self-stretch pt-0.5">
          {timeLabel ? (
            <span
              className="whitespace-nowrap text-[11px] leading-4"
              style={{ color: token.colorTextDescription }}
            >
              {timeLabel}
            </span>
          ) : (
            <span className="h-4" />
          )}
          {isUnread ? (
            <span
              className="mt-auto mb-1 h-2 w-2 rounded-full"
              style={{ background: token.colorPrimary }}
              aria-label={t("unreadDot")}
            />
          ) : (
            <span className="mt-auto mb-1 h-2 w-2" aria-hidden />
          )}
        </span>
      </button>

      {showDivider ? (
        <div
          style={{
            height: 1,
            background: token.colorSplit,
            marginInline: 16,
          }}
        />
      ) : null}
    </li>
  );
}
