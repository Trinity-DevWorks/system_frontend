import { Inter, Cairo } from "next/font/google";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { COLOR_MODE_BOOT_SCRIPT, resolvedColorModeFromCookieStore } from "@/lib/color-mode";
import { SIDEBAR_COLLAPSE_BOOT_SCRIPT } from "@/lib/sidebar-collapse";
import { cookies } from "next/headers";
import "./globals.css";
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
        <script
          dangerouslySetInnerHTML={{ __html: COLOR_MODE_BOOT_SCRIPT }}
        />
        <script
          dangerouslySetInnerHTML={{ __html: SIDEBAR_COLLAPSE_BOOT_SCRIPT }}
        />
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
