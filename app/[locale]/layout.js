import {
  colorModeFromCookieStore,
  resolvedColorModeFromCookieStore,
} from "@/lib/color-mode";
import AntdAppProvider from "@/shared/components/AntdAppProvider";
import DevI18nReload from "@/shared/components/DevI18nReload";
import LocaleHtmlLang from "@/shared/components/LocaleHtmlLang";
import { routing } from "@/i18n/routing";
import { hasLocale } from "next-intl";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

/** Locale shell: messages, theme, and the app providers. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const jar = await cookies();
  const initialColorMode = colorModeFromCookieStore(jar);
  const initialResolvedColorMode = resolvedColorModeFromCookieStore(jar);

  return (
    <NextIntlClientProvider messages={messages}>
      <AntdAppProvider
        initialColorMode={initialColorMode}
        initialResolvedColorMode={initialResolvedColorMode}
      >
        <LocaleHtmlLang />
        {process.env.NODE_ENV === "development" ? <DevI18nReload /> : null}
        {children}
      </AntdAppProvider>
    </NextIntlClientProvider>
  );
}
