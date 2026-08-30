"use client";

import { isRtlLocale } from "@/i18n/constants";
import { applyAppThemeToDocument, getAntdThemeConfig } from "@/lib/app-theme";
import {
  COLOR_MODE_DARK,
  COLOR_MODE_LIGHT,
  COLOR_MODE_SYSTEM,
  loadColorMode,
  saveColorMode,
} from "@/lib/color-mode";
import { ConfigProvider } from "antd";
import arEG from "antd/locale/ar_EG";
import enUS from "antd/locale/en_US";
import { useLocale } from "next-intl";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import dayjs from "@/lib/dayjs";

const antdLocales = {
  en: enUS,
  ar: arEG,
};

const dayjsLocales = {
  en: "en",
  ar: "ar",
};

const ThemeModeContext = createContext(null);

/**
 * @param {"system" | "light" | "dark"} mode
 * @param {boolean} prefersDark
 * @returns {"light" | "dark"}
 */
function resolveColorMode(mode, prefersDark) {
  if (mode === COLOR_MODE_SYSTEM) {
    return prefersDark ? COLOR_MODE_DARK : COLOR_MODE_LIGHT;
  }
  return mode;
}

export function useThemeMode() {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) {
    throw new Error("useThemeMode must be used within AntdAppProvider");
  }
  return ctx;
}

export default function AntdAppProvider({
  children,
  initialColorMode = COLOR_MODE_SYSTEM,
  initialResolvedColorMode = COLOR_MODE_LIGHT,
}) {
  const locale = useLocale();
  const direction = isRtlLocale(locale) ? "rtl" : "ltr";
  const antdLocale = antdLocales[locale] ?? enUS;

  const [colorMode, setColorModeState] = useState(() => {
    if (typeof window === "undefined") return initialColorMode;
    return loadColorMode();
  });
  const [systemPrefersDark, setSystemPrefersDark] = useState(() => {
    if (typeof window === "undefined") {
      return initialResolvedColorMode === COLOR_MODE_DARK;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    dayjs.locale(dayjsLocales[locale] ?? "en");
  }, [locale]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      setSystemPrefersDark(media.matches);
    };
    media.addEventListener("change", sync);
    return () => {
      media.removeEventListener("change", sync);
    };
  }, []);

  const resolvedColorMode = resolveColorMode(colorMode, systemPrefersDark);

  useEffect(() => {
    applyAppThemeToDocument(resolvedColorMode === COLOR_MODE_DARK);
    saveColorMode(colorMode, resolvedColorMode);
  }, [colorMode, resolvedColorMode]);

  const setColorMode = useCallback(
    (mode) => {
      const value = parseIncomingMode(mode);
      const resolved = resolveColorMode(value, systemPrefersDark);
      saveColorMode(value, resolved);
      setColorModeState(value);
    },
    [systemPrefersDark],
  );

  const toggleColorMode = useCallback(() => {
    setColorModeState((prev) => {
      const currentResolved = resolveColorMode(prev, systemPrefersDark);
      const next =
        currentResolved === COLOR_MODE_DARK ? COLOR_MODE_LIGHT : COLOR_MODE_DARK;
      saveColorMode(next, next);
      return next;
    });
  }, [systemPrefersDark]);

  const themeConfig = useMemo(
    () => getAntdThemeConfig(resolvedColorMode === COLOR_MODE_DARK),
    [resolvedColorMode],
  );

  const themeContextValue = useMemo(
    () => ({
      colorMode,
      resolvedColorMode,
      setColorMode,
      toggleColorMode,
    }),
    [colorMode, resolvedColorMode, setColorMode, toggleColorMode],
  );

  return (
    <ThemeModeContext.Provider value={themeContextValue}>
      <ConfigProvider
        direction={direction}
        locale={antdLocale}
        theme={themeConfig}
      >
        {children}
      </ConfigProvider>
    </ThemeModeContext.Provider>
  );
}

/**
 * @param {unknown} mode
 * @returns {"system" | "light" | "dark"}
 */
function parseIncomingMode(mode) {
  if (mode === COLOR_MODE_DARK || mode === COLOR_MODE_LIGHT || mode === COLOR_MODE_SYSTEM) {
    return mode;
  }
  return COLOR_MODE_SYSTEM;
}
