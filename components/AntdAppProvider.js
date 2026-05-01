"use client";

import { isRtlLocale } from "@/i18n/constants";
import { ConfigProvider, theme as antdTheme } from "antd";
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

const COLOR_MODE_STORAGE_KEY = "app-color-mode";
const COLOR_MODE_SYSTEM = "system";
const COLOR_MODE_LIGHT = "light";
const COLOR_MODE_DARK = "dark";

function applyColorModeToDocument(isDark) {
  const root = document.documentElement;
  if (isDark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  root.style.colorScheme = isDark ? "dark" : "light";
}

const ThemeModeContext = createContext(null);

export function useThemeMode() {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) {
    throw new Error("useThemeMode must be used within AntdAppProvider");
  }
  return ctx;
}

export default function AntdAppProvider({ children }) {
  const locale = useLocale();
  const direction = isRtlLocale(locale) ? "rtl" : "ltr";
  const antdLocale = antdLocales[locale] ?? enUS;

  const [colorMode, setColorModeState] = useState(COLOR_MODE_SYSTEM);
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);

  useEffect(() => {
    dayjs.locale(dayjsLocales[locale] ?? "en");
  }, [locale]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      setSystemPrefersDark(media.matches);
    };
    sync();
    media.addEventListener("change", sync);
    return () => {
      media.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      let initial = COLOR_MODE_SYSTEM;
      try {
        const stored = localStorage.getItem(COLOR_MODE_STORAGE_KEY);
        if (
          stored === COLOR_MODE_DARK ||
          stored === COLOR_MODE_LIGHT ||
          stored === COLOR_MODE_SYSTEM
        ) {
          initial = stored;
        }
      } catch {
        /* ignore */
      }
      setColorModeState(initial);
    });
  }, []);

  const resolvedColorMode =
    colorMode === COLOR_MODE_SYSTEM
      ? systemPrefersDark
        ? COLOR_MODE_DARK
        : COLOR_MODE_LIGHT
      : colorMode;

  useEffect(() => {
    applyColorModeToDocument(resolvedColorMode === COLOR_MODE_DARK);
  }, [resolvedColorMode]);

  const setColorMode = useCallback((mode) => {
    setColorModeState(mode);
    try {
      localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleColorMode = useCallback(() => {
    setColorModeState((prev) => {
      const currentResolved =
        prev === COLOR_MODE_SYSTEM
          ? systemPrefersDark
            ? COLOR_MODE_DARK
            : COLOR_MODE_LIGHT
          : prev;
      const next =
        currentResolved === COLOR_MODE_DARK
          ? COLOR_MODE_LIGHT
          : COLOR_MODE_DARK;
      try {
        localStorage.setItem(COLOR_MODE_STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [systemPrefersDark]);

  const themeConfig = useMemo(
    () => ({
      algorithm:
        resolvedColorMode === COLOR_MODE_DARK
          ? antdTheme.darkAlgorithm
          : antdTheme.defaultAlgorithm,
    }),
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
