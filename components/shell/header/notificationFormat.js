/**
 * Formats business notification rows for the header inbox panel (Phase 1).
 *
 * What: Maps API `type` + `params` + `severity` to localized copy, icons, and accent colors.
 * Used for: NotificationBell panel rows and the full notifications page.
 * Solves: Keeps English/Arabic copy in next-intl and keeps visual category cues consistent.
 */

import {
  BellOutlined,
  CheckCircleOutlined,
  DatabaseOutlined,
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
 * @param {{ type?: string, params?: Record<string, unknown>, severity?: string }} notification
 * @param {import("next-intl").Translator<any>} t
 */
export function formatNotificationTitle(notification, t) {
  const type = notification?.type || "unknown";
  const params =
    notification?.params && typeof notification.params === "object"
      ? notification.params
      : {};
  const key = `types.${type}.title`;

  if (typeof t.has === "function" && !t.has(key)) {
    return t("types.unknown.title");
  }

  return t(key, params);
}

/**
 * @param {{ type?: string, params?: Record<string, unknown> }} notification
 * @param {import("next-intl").Translator<any>} t
 */
export function formatNotificationBody(notification, t) {
  const type = notification?.type || "unknown";
  const params =
    notification?.params && typeof notification.params === "object"
      ? notification.params
      : {};
  const key = `types.${type}.body`;

  if (typeof t.has === "function" && !t.has(key)) {
    return t("types.unknown.body");
  }

  return t(key, params);
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

  if (type.startsWith("purchasing.low_stock") || severity === "critical") {
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
  } else if (type === "user.created") {
    visual = {
      Icon: UserAddOutlined,
      accent: "#9254de",
      iconBg: "rgba(146, 84, 222, 0.15)",
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
      accent: "#9254de",
      iconBg: "rgba(146, 84, 222, 0.15)",
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
