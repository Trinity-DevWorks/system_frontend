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

  const [colorMode, setColorModeState] = useState("light");

  useEffect(() => {
    dayjs.locale(dayjsLocales[locale] ?? "en");
  }, [locale]);

  useEffect(() => {
    queueMicrotask(() => {
      let initial = "light";
      try {
        const stored = localStorage.getItem(COLOR_MODE_STORAGE_KEY);
        if (stored === "dark" || stored === "light") {
          initial = stored;
        } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
          initial = "dark";
        }
      } catch {
        /* ignore */
      }
      setColorModeState(initial);
      applyColorModeToDocument(initial === "dark");
    });
  }, []);

  const setColorMode = useCallback((mode) => {
    setColorModeState(mode);
    try {
      localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
    applyColorModeToDocument(mode === "dark");
  }, []);

  const toggleColorMode = useCallback(() => {
    setColorModeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(COLOR_MODE_STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      applyColorModeToDocument(next === "dark");
      return next;
    });
  }, []);

  const themeConfig = useMemo(
    () => ({
      algorithm:
        colorMode === "dark"
          ? antdTheme.darkAlgorithm
          : antdTheme.defaultAlgorithm,
    }),
    [colorMode],
  );

  const themeContextValue = useMemo(
    () => ({
      colorMode,
      setColorMode,
      toggleColorMode,
    }),
    [colorMode, setColorMode, toggleColorMode],
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
