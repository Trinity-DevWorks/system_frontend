/**
 * Formats business notification rows for the header inbox panel (Phase 1).
 *
 * What: Maps API `type` + `params` + `severity` to localized copy, icons, and accent colors.
 * Used for: NotificationBell panel rows and the full notifications page.
 * Solves: Keeps English/Arabic copy in next-intl and keeps visual category cues consistent.
 */

import {
  BellOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  DatabaseOutlined,
  DropboxOutlined,
  FileDoneOutlined,
  SafetyCertificateOutlined,
  ShoppingCartOutlined,
  SwapOutlined,
  TeamOutlined,
  UserAddOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import dayjs from "@/lib/dayjs";

/**
 * Walk the Notifications.types tree for an API type like `stock.lot_expiry_item`.
 *
 * next-intl's `t.has("types.stock.lot_expiry_item.title")` is unreliable for
 * dynamic dotted keys (and can miss siblings like `lot_expiry` / `lot_expiry_item`),
 * which made inbox rows fall back to "You have a new notification."
 *
 * @param {Record<string, unknown> | null | undefined} messages
 * @param {string} type
 * @param {"title" | "body"} field
 * @returns {string | null}
 */
export function getNotificationTypeMessage(messages, type, field) {
  const root =
    messages?.Notifications && typeof messages.Notifications === "object"
      ? messages.Notifications
      : messages;
  let node = root?.types;
  for (const part of String(type || "").split(".")) {
    if (!part || node == null || typeof node !== "object") return null;
    node = /** @type {Record<string, unknown>} */ (node)[part];
  }
  if (node == null || typeof node !== "object") return null;
  const value = /** @type {Record<string, unknown>} */ (node)[field];
  return typeof value === "string" ? value : null;
}

/**
 * Simple `{name}` interpolation. Type copy only uses named placeholders, not ICU plurals.
 *
 * @param {string} template
 * @param {Record<string, unknown>} params
 */
function interpolateTemplate(template, params) {
  return template.replace(/\{(\w+)\}/g, (_, name) => {
    if (!Object.prototype.hasOwnProperty.call(params, name)) return "";
    const value = params[name];
    return value == null ? "" : String(value);
  });
}

/**
 * @param {{ type?: string, params?: Record<string, unknown>, severity?: string }} notification
 * @param {import("next-intl").Translator<any>} t
 * @param {Record<string, unknown> | null | undefined} [messages]
 */
export function formatNotificationTitle(notification, t, messages) {
  const type = notification?.type || "unknown";
  const params =
    notification?.params && typeof notification.params === "object"
      ? notification.params
      : {};
  const template = getNotificationTypeMessage(messages, type, "title");
  if (template) return interpolateTemplate(template, params);
  if (messages == null) return t(`types.${type}.title`, params);
  return t("types.unknown.title");
}

/**
 * @param {{ type?: string, params?: Record<string, unknown> }} notification
 * @param {import("next-intl").Translator<any>} t
 * @param {Record<string, unknown> | null | undefined} [messages]
 */
export function formatNotificationBody(notification, t, messages) {
  const type = notification?.type || "unknown";
  const params =
    notification?.params && typeof notification.params === "object"
      ? notification.params
      : {};
  const template = getNotificationTypeMessage(messages, type, "body");
  if (template) return interpolateTemplate(template, params);
  if (messages == null) return t(`types.${type}.body`, params);
  return t("types.unknown.body");
}

/**
 * @param {string | null | undefined} iso
 * @param {string} locale
 */
export function formatNotificationTime(iso, locale) {
  if (!iso) return "";
  const d = dayjs(iso).locale(locale === "ar" ? "ar" : "en");
  if (!d.isValid()) return "";
  return d.fromNow();
}

/**
 * Category-aware icon + tint for the mock-style notification rows.
 *
 * @param {{ type?: string, severity?: string }} notification
 * @param {import("antd").GlobalToken} token
 */
export function notificationVisual(notification, token) {
  const type = notification?.type || "";
  const severity = notification?.severity || "info";

  /** @type {{ Icon: typeof BellOutlined, accent: string, iconBg: string }} */
  let visual = {
    Icon: BellOutlined,
    accent: token.colorPrimary,
    iconBg: token.colorPrimaryBg,
  };

  if (type.startsWith("stock.lot_expiry")) {
    visual = {
      Icon: CalendarOutlined,
      accent: severity === "critical" ? token.colorError : token.colorWarning,
      iconBg: severity === "critical" ? token.colorErrorBg : token.colorWarningBg,
    };
  } else if (type.startsWith("purchasing.low_stock") || severity === "critical") {
    visual = {
      Icon: WarningOutlined,
      accent: token.colorWarning,
      iconBg: token.colorWarningBg,
    };
  } else if (type.startsWith("purchase_order.")) {
    visual = {
      Icon: type.endsWith(".cancelled") ? FileDoneOutlined : CheckCircleOutlined,
      accent: type.endsWith(".cancelled") ? token.colorWarning : token.colorSuccess,
      iconBg: type.endsWith(".cancelled") ? token.colorWarningBg : token.colorSuccessBg,
    };
  } else if (type.startsWith("goods_receipt.")) {
    visual = {
      Icon: DropboxOutlined,
      accent: token.colorSuccess,
      iconBg: token.colorSuccessBg,
    };
  } else if (type === "user.created") {
    visual = {
      Icon: UserAddOutlined,
      accent: token.colorPrimary,
      iconBg: token.colorPrimaryBg,
    };
  } else if (type === "user.role_assigned") {
    visual = {
      Icon: SafetyCertificateOutlined,
      accent: token.colorWarning,
      iconBg: token.colorWarningBg,
    };
  } else if (type === "user.deactivated") {
    visual = {
      Icon: SafetyCertificateOutlined,
      accent: token.colorError,
      iconBg: token.colorErrorBg,
    };
  } else if (type.startsWith("branch.")) {
    visual = {
      Icon: TeamOutlined,
      accent: token.colorInfo || token.colorPrimary,
      iconBg: token.colorInfoBg || token.colorPrimaryBg,
    };
  } else if (type.startsWith("stock_transfer.") || type.startsWith("stock_movement.")) {
    visual = {
      Icon: SwapOutlined,
      accent: token.colorInfo || token.colorPrimary,
      iconBg: token.colorInfoBg || token.colorPrimaryBg,
    };
  } else if (type.startsWith("purchasing.")) {
    visual = {
      Icon: ShoppingCartOutlined,
      accent: token.colorWarning,
      iconBg: token.colorWarningBg,
    };
  } else if (severity === "success") {
    visual = {
      Icon: DatabaseOutlined,
      accent: token.colorSuccess,
      iconBg: token.colorSuccessBg,
    };
  }

  return visual;
}
