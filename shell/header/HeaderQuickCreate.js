"use client";

import { quickCreateFeatures } from "@/features/registry";
import { findNavLabelForPath } from "@/shell/sidebar/main-nav";
import { useRouter } from "@/i18n/navigation";
import { buildResourceDrawerHref } from "@/lib/drawer/useResourceDrawerUrl";
import { usePermissions } from "@/lib/permissions";
import { PlusOutlined } from "@ant-design/icons";
import { Dropdown, Tooltip } from "antd";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

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
      quickCreateFeatures()
        .map(({ path, permission }) => {
          // Absent from nav = module not entitled or no view access.
          const label = findNavLabelForPath(navItems, path);
          if (!label) return null;
          if (typeof can === "function" && !can(permission, "create")) return null;
          return { key: path, label };
        })
        .filter(Boolean),
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
