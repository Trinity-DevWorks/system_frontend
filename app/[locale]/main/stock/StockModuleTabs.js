"use client";

/**
 * Tab bar for the Stock module (balances, movements, transfers).
 *
 * Used by:
 * - app/[locale]/main/stock/layout.js
 */

import { ROUTES } from "@/components/shell/sidebar/main-nav";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Tabs } from "antd";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { usePurchasingAlertCountQuery } from "./usePurchasingAlertCountQuery";

/**
 * @param {{ children: import("react").ReactNode }} props
 */
export default function StockModuleTabs({ children }) {
  const t = useTranslations("Stock");
  const pathname = usePathname();
  const router = useRouter();
  const alertCount = usePurchasingAlertCountQuery();

  const activeKey = pathname.startsWith(ROUTES.stockTransfers)
    ? "transfers"
    : pathname.startsWith(ROUTES.stockPurchaseOrders)
      ? "purchase-orders"
      : pathname.startsWith(ROUTES.stockPurchasingAlerts)
        ? "purchasing-alerts"
        : pathname.startsWith(ROUTES.stockMovements)
          ? "movements"
          : "balances";

  const items = useMemo(
    () => [
      { key: "balances", label: t("tabBalances") },
      {
        key: "purchasing-alerts",
        label: (
          <span className="inline-flex items-center gap-1.5">
            {t("tabPurchasingAlerts")}
            {alertCount > 0 ? (
              <span
                aria-label={String(alertCount)}
                className="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--ant-color-error)] px-1 text-[11px] font-medium leading-none text-white tabular-nums"
              >
                {alertCount > 99 ? "99+" : alertCount}
              </span>
            ) : null}
          </span>
        ),
      },
      { key: "movements", label: t("tabMovements") },
      { key: "purchase-orders", label: t("tabPurchaseOrders") },
      { key: "transfers", label: t("tabTransfers") },
    ],
    [alertCount, t],
  );

  return (
    <div className="stock-module-shell flex min-h-0 min-w-0 flex-1 flex-col">
      <Tabs
        className="stock-module-tabs"
        activeKey={activeKey}
        items={items}
        onChange={(key) => {
          if (key === "movements") router.push(ROUTES.stockMovements);
          else if (key === "transfers") router.push(ROUTES.stockTransfers);
          else if (key === "purchase-orders") router.push(ROUTES.stockPurchaseOrders);
          else if (key === "purchasing-alerts") router.push(ROUTES.stockPurchasingAlerts);
          else router.push(ROUTES.stockBalances);
        }}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
