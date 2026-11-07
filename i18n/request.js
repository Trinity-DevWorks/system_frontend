import { readFile } from "node:fs/promises";
import path from "node:path";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

async function loadMessages(locale) {
  // Turbopack caches large JSON imports and ignores later edits until restart.
  if (process.env.NODE_ENV === "development") {
    const file = path.join(process.cwd(), "messages", `${locale}.json`);
    return JSON.parse(await readFile(file, "utf8"));
  }

  return (await import(`../messages/${locale}.json`)).default;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: await loadMessages(locale),
  };
});

