"use client";

import { isRtlLocale } from "@/i18n/constants";
import { useLocale } from "next-intl";
import { useEffect } from "react";

export default function LocaleHtmlLang() {
  const locale = useLocale();

  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = isRtlLocale(locale) ? "rtl" : "ltr";
  }, [locale]);

  return null;
}
