"use client";

/**
 * Compact secondary nav for the Settings workspace (Company Profile / Company Settings).
 * Not a second application sidebar — sits inside content beside the selected page.
 */

import { ROUTES } from "@/components/shell/sidebar/main-nav";
import { usePathname, useRouter } from "@/i18n/navigation";
import { BankOutlined, SettingOutlined } from "@ant-design/icons";
import { theme } from "antd";
import { useTranslations } from "next-intl";

/**
 * @param {{ path: string, pathname: string }} args
 */
function isActivePath(path, pathname) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

/**
 * @param {{
 *   path: string,
 *   label: string,
 *   icon: import("react").ReactNode,
 *   active: boolean,
 *   onNavigate: (path: string) => void,
 * }} props
 */
function SettingsNavRow({ path, label, icon, active, onNavigate }) {
  const { token } = theme.useToken();

  return (
    <button
      type="button"
      onClick={() => onNavigate(path)}
      aria-current={active ? "page" : undefined}
      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-start text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-offset-1"
      style={{
        color: active ? token.colorPrimary : token.colorText,
        background: active ? token.colorPrimaryBg : "transparent",
        outlineColor: token.colorPrimary,
      }}
      onMouseEnter={(e) => {
        if (active) return;
        e.currentTarget.style.background = token.colorFillTertiary;
      }}
      onMouseLeave={(e) => {
        if (active) {
          e.currentTarget.style.background = token.colorPrimaryBg;
          return;
        }
        e.currentTarget.style.background = "transparent";
      }}
      onFocus={(e) => {
        e.currentTarget.style.boxShadow = `0 0 0 2px ${token.colorPrimaryBorder}`;
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <span className="inline-flex shrink-0 text-base leading-none" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  );
}

export default function SettingsSecondaryNav() {
  const t = useTranslations("Shell");
  const pathname = usePathname();
  const router = useRouter();
  const { token } = theme.useToken();

  const items = [
    {
      path: ROUTES.settingsCompanyProfile,
      label: t("navCompanyProfile"),
      icon: <BankOutlined />,
    },
    {
      path: ROUTES.settingsCompanySettings,
      label: t("navCompanySettings"),
      icon: <SettingOutlined />,
    },
  ];

  return (
    <nav
      aria-label={t("settingsSecondaryNavAria")}
      className="w-full shrink-0 md:w-46 lg:w-50"
    >
      <div
        className="mb-1.5 px-2.5 text-xs font-semibold uppercase tracking-wide"
        style={{ color: token.colorTextSecondary }}
      >
        {t("settingsCompanyGroup")}
      </div>
      <div className="flex flex-col gap-0.5">
        {items.map((item) => (
          <SettingsNavRow
            key={item.path}
            path={item.path}
            label={item.label}
            icon={item.icon}
            active={isActivePath(item.path, pathname)}
            onNavigate={(path) => router.push(path)}
          />
        ))}
      </div>
    </nav>
  );
}
