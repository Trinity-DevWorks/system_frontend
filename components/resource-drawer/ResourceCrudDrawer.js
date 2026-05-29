"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { isRtlLocale } from "@/i18n/constants";
import { Drawer, Skeleton } from "antd";
import { useLocale } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import ResourceDrawerHeader from "./ResourceDrawerHeader";

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
 *   skeletonParagraphRows?: number;
 *   children: import("react").ReactNode;
 *   size?: number | "default" | "large";
 *   zIndex?: number;
 * }} props
 */
export default function ResourceCrudDrawer({
  title,
  recordName = null,
  statusActive = null,
  statusActiveLabel,
  statusInactiveLabel,
  showExpand = true,
  open,
  requestClose,
  submitting,
  footer,
  showDetailLoading,
  detailLoadFailed,
  detailError,
  tApiErrors,
  skeletonParagraphRows = 5,
  children,
  size = 520,
  zIndex,
}) {
  const locale = useLocale();
  const placement = isRtlLocale(locale) ? "left" : "right";
  const [expanded, setExpanded] = useState(false);

  const handleToggleExpand = useCallback(() => {
    setExpanded((v) => !v);
  }, []);

  const handleClose = useCallback(() => {
    setExpanded(false);
    requestClose();
  }, [requestClose]);

  const drawerSize = useMemo(() => {
    if (open && expanded) return "100%";
    return size;
  }, [open, expanded, size]);

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
    />
  );

  return (
    <Drawer
      title={drawerTitle}
      size={drawerSize}
      placement={placement}
      open={open}
      onClose={handleClose}
      destroyOnClose
      maskClosable={!submitting}
      closable={false}
      footer={footer}
      zIndex={zIndex}
      classNames={{
        header: "resource-crud-drawer-header",
        body: "resource-crud-drawer-body",
        footer: "resource-crud-drawer-footer",
      }}
    >
      {detailLoadFailed ? (
        <p className="text-sm text-red-600 dark:text-red-400">{getLocalizedApiErrorMessage(tApiErrors, detailError)}</p>
      ) : (
        <div className="relative min-h-[120px]">
          {showDetailLoading ? (
            <div className="absolute inset-0 z-10 flex bg-[var(--ant-color-bg-container)]">
              <Skeleton active className="w-full" paragraph={{ rows: skeletonParagraphRows }} />
            </div>
          ) : null}
          {children}
        </div>
      )}
    </Drawer>
  );
}
