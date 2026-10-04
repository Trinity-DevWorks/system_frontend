import { Inter, Cairo } from "next/font/google";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { resolvedColorModeFromCookieStore } from "@/lib/color-mode";
import { cookies } from "next/headers";
import "./globals.css";
import DocumentBootScripts from "./document-boot-scripts";
import Providers from "./providers";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  fallback: ["system-ui", "Segoe UI", "Roboto", "Helvetica Neue", "Arial"],
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  display: "swap",
  variable: "--font-cairo",
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
  fallback: ["system-ui", "Tahoma", "Arial"],
});

export default async function RootLayout({ children }) {
  const jar = await cookies();
  const isDark = resolvedColorModeFromCookieStore(jar) === "dark";

  return (
    <html lang="en" className={isDark ? "dark" : undefined} suppressHydrationWarning>
      <head>
        <DocumentBootScripts />
      </head>
      <body
        className={`${inter.variable} ${cairo.variable} min-h-full flex flex-col antialiased`}
        suppressHydrationWarning
      >
        <AntdRegistry>
          <Providers>{children}</Providers>
        </AntdRegistry>
      </body>
    </html>
  );
}
