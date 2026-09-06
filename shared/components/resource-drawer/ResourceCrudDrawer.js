"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useDrawerHostPresence } from "@/lib/drawer/DrawerHostPresence";
import { isRtlLocale } from "@/i18n/constants";
import { Drawer, Spin } from "antd";
import { useLocale } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import ResourceDrawerHeader from "@/shared/components/resource-drawer/ResourceDrawerHeader";

/**
 * Shared drawer chrome: rich header, loading / detail error / body, same for every CRUD resource drawer.
 *
 * @param {{
 *   title: import("react").ReactNode;
 *   recordName?: string | null;
 *   statusActive?: boolean | null;
 *   statusActiveLabel?: string;
 *   statusInactiveLabel?: string;
 *   showExpand?: boolean;
 *   open: boolean;
 *   requestClose: () => void;
 *   submitting: boolean;
 *   footer: import("react").ReactNode;
 *   showDetailLoading: boolean;
 *   detailLoadFailed: boolean;
 *   detailError: unknown;
 *   tApiErrors: (key: string) => string;
 *   children: import("react").ReactNode;
 *   size?: number | string | "default" | "large";
 *   zIndex?: number;
 *   placement?: "top" | "bottom" | "left" | "right";
 *   headerExtra?: import("react").ReactNode;
 * }} props
 */
export default function ResourceCrudDrawer({
  title,
  recordName = null,
  statusActive = null,
  statusActiveLabel,
  statusInactiveLabel,
  showExpand = true,
  headerExtra = null,
  open,
  requestClose,
  submitting,
  footer,
  showDetailLoading,
  detailLoadFailed,
  detailError,
  tApiErrors,
  children,
  size = 520,
  zIndex,
  placement: placementOverride,
}) {
  const locale = useLocale();
  const placement = placementOverride ?? (isRtlLocale(locale) ? "left" : "right");
  const hostPresence = useDrawerHostPresence();
  const [expanded, setExpanded] = useState(false);

  const handleToggleExpand = useCallback(() => {
    setExpanded((v) => !v);
  }, []);

  const handleClose = useCallback(() => {
    setExpanded(false);
    requestClose();
  }, [requestClose]);

  const isVertical = placement === "top" || placement === "bottom";
  const drawerSize = useMemo(() => {
    if (!isVertical && open && expanded) return "100%";
    return size;
  }, [open, expanded, size, isVertical]);

  const drawerTitle = (
    <ResourceDrawerHeader
      title={title}
      recordName={recordName}
      statusActive={statusActive}
      statusActiveLabel={statusActiveLabel}
      statusInactiveLabel={statusInactiveLabel}
      expanded={expanded}
      onToggleExpand={showExpand ? handleToggleExpand : undefined}
      onClose={handleClose}
      closeDisabled={submitting}
      showExpand={showExpand}
      headerExtra={headerExtra}
    />
  );

  return (
    <Drawer
      title={drawerTitle}
      size={drawerSize}
      placement={placement}
      open={open}
      onClose={handleClose}
      afterOpenChange={hostPresence?.afterOpenChange}
      destroyOnClose
      maskClosable={!submitting}
      closable={false}
      footer={footer}
      zIndex={zIndex}
      className={[
        isVertical ? "resource-crud-drawer-top" : null,
        showDetailLoading ? "resource-crud-drawer-loading" : null,
      ]
        .filter(Boolean)
        .join(" ") || undefined}
      classNames={{
        header: "resource-crud-drawer-header",
        body: "resource-crud-drawer-body",
        footer: "resource-crud-drawer-footer",
      }}
    >
      {detailLoadFailed ? (
        <p className="text-sm text-red-600 dark:text-red-400">{getLocalizedApiErrorMessage(tApiErrors, detailError)}</p>
      ) : (
        showDetailLoading ? (
          <div className="resource-drawer-detail-loading">
            <Spin size="large" />
          </div>
        ) : (
          <div className="relative min-h-[120px]">{children}</div>
        )
      )}
    </Drawer>
  );
}
