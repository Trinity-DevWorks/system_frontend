import { theme as antdTheme } from "antd";

/**
 * ERP brand palette from the auth screens: navy rail, slate surfaces, sky accents.
 * Seed values only — UI should consume Ant Design tokens or CSS variables, not these hexes.
 */
export const APP_PALETTE = {
  navyDeep: "#0A1628",
  navy: "#0F172A",
  navyMid: "#1E3A5F",
  primaryLight: "#1D4E89",
  primaryDark: "#3B82F6",
  accent: "#2563EB",
  accentDark: "#60A5FA",
  sky: "#38BDF8",
  pageLight: "#F8FAFC",
  pageDark: "#0B0F19",
  containerLight: "#FFFFFF",
  containerDark: "#111827",
  elevatedDark: "#1E293B",
  textLight: "#0F172A",
  textDark: "#F1F5F9",
  mutedLight: "#64748B",
  mutedDark: "#94A3B8",
  borderLight: "#E2E8F0",
  borderDark: "#334155",
  success: "#059669",
  warning: "#D97706",
  error: "#DC2626",
};

/** Default swatch for new category records — brand accent, not chrome. */
export const DEFAULT_CATEGORY_COLOR = APP_PALETTE.accent;

/**
 * @param {string} hex
 * @param {number} alpha
 */
function hexToRgba(hex, alpha) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  const n = Number.parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/**
 * CSS custom properties for Tailwind / globals.css.
 * Navy/sky stay constant (login rail); brand/page colors follow light|dark.
 *
 * @param {boolean} isDark
 * @returns {Record<string, string>}
 */
export function getAppCssVars(isDark) {
  return {
    "--app-page-bg": isDark ? APP_PALETTE.pageDark : APP_PALETTE.pageLight,
    "--app-page-fg": isDark ? APP_PALETTE.textDark : APP_PALETTE.textLight,
    "--app-brand": isDark ? APP_PALETTE.primaryDark : APP_PALETTE.primaryLight,
    "--app-brand-accent": isDark ? APP_PALETTE.accentDark : APP_PALETTE.accent,
    "--app-navy": APP_PALETTE.navy,
    "--app-navy-deep": APP_PALETTE.navyDeep,
    "--app-sky": APP_PALETTE.sky,
    "--app-success": APP_PALETTE.success,
    "--app-warning": APP_PALETTE.warning,
    "--app-error": APP_PALETTE.error,
  };
}

/**
 * @param {boolean} isDark
 */
export function applyAppThemeToDocument(isDark) {
  const root = document.documentElement;
  const vars = getAppCssVars(isDark);
  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value);
  }
  root.classList.toggle("dark", isDark);
  root.style.colorScheme = isDark ? "dark" : "light";
}

/**
 * @param {boolean} isDark
 */
export function getAntdThemeConfig(isDark) {
  const colorPrimary = isDark
    ? APP_PALETTE.primaryDark
    : APP_PALETTE.primaryLight;
  const colorInfo = isDark ? APP_PALETTE.primaryDark : APP_PALETTE.accent;
  const colorBgLayout = isDark ? APP_PALETTE.pageDark : APP_PALETTE.pageLight;
  const colorBgContainer = isDark
    ? APP_PALETTE.containerDark
    : APP_PALETTE.containerLight;
  const colorBgElevated = colorBgLayout;

  return {
    algorithm: isDark
      ? antdTheme.darkAlgorithm
      : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary,
      colorInfo,
      colorLink: colorInfo,
      colorSuccess: APP_PALETTE.success,
      colorWarning: APP_PALETTE.warning,
      colorError: APP_PALETTE.error,
      borderRadius: 8,
      borderRadiusLG: 12,
      colorBgLayout,
      colorBgContainer,
      colorBgElevated,
      colorText: isDark ? APP_PALETTE.textDark : APP_PALETTE.textLight,
      colorTextSecondary: isDark ? APP_PALETTE.mutedDark : APP_PALETTE.mutedLight,
      colorBorder: isDark ? APP_PALETTE.borderDark : APP_PALETTE.borderLight,
      fontFamily: "var(--font-locale), sans-serif",
      controlOutline: hexToRgba(colorPrimary, isDark ? 0.28 : 0.22),
    },
    components: {
      Layout: {
        bodyBg: colorBgLayout,
        headerBg: colorBgContainer,
        siderBg: colorBgContainer,
      },
      Button: {
        primaryShadow: `0 2px 8px ${hexToRgba(colorPrimary, isDark ? 0.28 : 0.2)}`,
        borderRadius: 8,
      },
      Menu: {
        itemBorderRadius: 10,
      },
      Card: {
        borderRadiusLG: 12,
      },
      Input: {
        activeBorderColor: colorPrimary,
        hoverBorderColor: isDark ? APP_PALETTE.mutedLight : APP_PALETTE.mutedDark,
      },
      Drawer: {
        colorBgElevated,
        colorBgMask: isDark ? "rgba(0, 0, 0, 0.45)" : "rgba(15, 23, 42, 0.35)",
      },
      Popover: {
        colorBgElevated,
      },
      Dropdown: {
        colorBgElevated,
      },
      Modal: {
        contentBg: colorBgElevated,
        headerBg: colorBgElevated,
        footerBg: colorBgElevated,
      },
    },
  };
}
