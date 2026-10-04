import {
  colorModeFromCookieStore,
  resolvedColorModeFromCookieStore,
} from "@/lib/color-mode";
import { PlatformBrandingProvider } from "@/lib/platform-branding";
import { FALLBACK_PLATFORM_LOGO, platformLogoUrl } from "@/lib/platform-branding-shape";
import { fetchPlatformBranding } from "@/lib/server/fetchPlatformBranding";
import AntdAppProvider from "@/shared/components/AntdAppProvider";
import LocaleHtmlLang from "@/shared/components/LocaleHtmlLang";
import { routing } from "@/i18n/routing";
import { hasLocale } from "next-intl";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  const branding = await fetchPlatformBranding();

  return {
    title: branding.name,
    description: t("description"),
    icons: { icon: platformLogoUrl(branding) ?? FALLBACK_PLATFORM_LOGO },
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
  const branding = await fetchPlatformBranding();

  return (
    <NextIntlClientProvider messages={messages}>
      <PlatformBrandingProvider initialBranding={branding}>
        <AntdAppProvider
          initialColorMode={initialColorMode}
          initialResolvedColorMode={initialResolvedColorMode}
        >
          <LocaleHtmlLang />
          {children}
        </AntdAppProvider>
      </PlatformBrandingProvider>
    </NextIntlClientProvider>
  );
}
