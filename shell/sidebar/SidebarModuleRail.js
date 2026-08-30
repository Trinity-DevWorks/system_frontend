"use client";

import WorkspaceBrandMark from "@/features/settings/components/WorkspaceBrandMark";
import { Tooltip } from "antd";
import { SHELL_CHROME_HEIGHT_PX } from "@/shell/shell-metrics";

/**
 * @param {{
 *   module: import("antd").MenuProps["items"][number],
 *   active: boolean,
 *   previewing: boolean,
 *   tooltipPlacement: "right" | "left",
 *   onSelect: (module: any) => void,
 * }} props
 */
function RailButton({
  module: navModule,
  active,
  previewing,
  tooltipPlacement,
  onSelect,
}) {
  const className = [
    "shell-rail-btn",
    active ? "is-active" : "",
    previewing ? "is-previewing" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Tooltip title={navModule.label} placement={tooltipPlacement}>
      <button
        type="button"
        className={className}
        onClick={() => onSelect(navModule)}
        aria-label={navModule.label}
        aria-current={active ? "true" : undefined}
      >
        <span className="shell-rail-btn-icon" aria-hidden>
          {navModule.icon}
        </span>
      </button>
    </Tooltip>
  );
}

/**
 * Narrow always-visible rail of top-level modules.
 *
 * Hover shows the module name only. Click opens that module's pages in the panel.
 *
 * @param {{
 *   modules: import("antd").MenuProps["items"],
 *   footerModules: import("antd").MenuProps["items"],
 *   activeModuleKey: string | null,
 *   previewModuleKey: string | null,
 *   onSelectModule: (module: any) => void,
 *   brand: string,
 *   brandLogo?: object | null,
 *   onBrandClick: () => void,
 *   tooltipPlacement: "right" | "left",
 *   ariaLabel: string,
 * }} props
 */
export default function SidebarModuleRail({
  modules,
  footerModules,
  activeModuleKey,
  previewModuleKey,
  onSelectModule,
  brand,
  brandLogo,
  onBrandClick,
  tooltipPlacement,
  ariaLabel,
}) {
  return (
    <nav className="shell-rail" aria-label={ariaLabel}>
      <div
        className="shell-rail-brand"
        style={{ height: SHELL_CHROME_HEIGHT_PX, minHeight: SHELL_CHROME_HEIGHT_PX }}
      >
        <Tooltip title={brand} placement={tooltipPlacement}>
          <button
            type="button"
            className="shell-rail-brand-btn"
            onClick={onBrandClick}
            aria-label={brand}
          >
            <WorkspaceBrandMark logo={brandLogo} alt={brand} size={26} />
          </button>
        </Tooltip>
      </div>

      <div className="shell-rail-scroll app-hide-scrollbar">
        {(modules ?? []).map((navModule) => (
          <RailButton
            key={navModule.key}
            module={navModule}
            active={navModule.key === activeModuleKey}
            previewing={navModule.key === previewModuleKey}
            tooltipPlacement={tooltipPlacement}
            onSelect={onSelectModule}
          />
        ))}
      </div>

      {footerModules?.length ? (
        <div className="shell-rail-footer">
          {footerModules.map((navModule) => (
            <RailButton
              key={navModule.key}
              module={navModule}
              active={navModule.key === activeModuleKey}
              previewing={navModule.key === previewModuleKey}
              tooltipPlacement={tooltipPlacement}
              onSelect={onSelectModule}
            />
          ))}
        </div>
      ) : null}
    </nav>
  );
}
