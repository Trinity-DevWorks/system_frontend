"use client";

import { ROUTES, findNavLabelForPath } from "@/components/shell/sidebar/main-nav";
import { useRouter } from "@/i18n/navigation";
import { buildResourceDrawerHref } from "@/lib/drawer/useResourceDrawerUrl";
import { usePermissions } from "@/lib/permissions";
import { PlusOutlined } from "@ant-design/icons";
import { Dropdown, Tooltip } from "antd";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

/** Records created often enough to deserve a shortcut from anywhere in the app. */
const QUICK_CREATE_ROUTES = [
  { route: ROUTES.items, permission: "items" },
  { route: ROUTES.customers, permission: "customers" },
  { route: ROUTES.suppliers, permission: "suppliers" },
  { route: ROUTES.brands, permission: "brands" },
  { route: ROUTES.categories, permission: "categories" },
];

/**
 * "+" menu that deep-links straight into a list page's create drawer.
 *
 * @param {{ navItems: import("antd").MenuProps["items"] }} props
 */
export default function HeaderQuickCreate({ navItems }) {
  const t = useTranslations("Shell");
  const router = useRouter();
  const { can } = usePermissions();

  const items = useMemo(
    () =>
      QUICK_CREATE_ROUTES.map(({ route, permission }) => {
        // Absent from nav = module not entitled or no view access.
        const label = findNavLabelForPath(navItems, route);
        if (!label) return null;
        if (typeof can === "function" && !can(permission, "create")) return null;
        return { key: route, label };
      }).filter(Boolean),
    [navItems, can],
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <Dropdown
      menu={{
        items,
        onClick: ({ key }) => router.push(buildResourceDrawerHref(key, null, "create")),
      }}
      trigger={["click"]}
      placement="bottomRight"
    >
      <Tooltip title={t("quickCreate")}>
        <button
          type="button"
          className="shell-header-icon-btn"
          aria-label={t("quickCreate")}
        >
          <PlusOutlined />
        </button>
      </Tooltip>
    </Dropdown>
  );
}
