"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useDrawerHostPresence } from "@/lib/drawer/DrawerHostPresence";
import { useDrawerStackDepth } from "@/lib/drawer/DrawerStackDepth";
import { isRtlLocale } from "@/i18n/constants";
import { Drawer, Spin } from "antd";
import { useLocale } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ResourceDrawerHeader from "@/shared/components/resource-drawer/ResourceDrawerHeader";
import { focusFirstDrawerField } from "@/shared/components/resource-drawer/focusFirstDrawerField";
import DocumentBranchTag from "@/shared/components/document-branch/DocumentBranchTag";

/** "Pushed back" look when other drawers are stacked on top (per level above). */
const STACK_SCALE_STEP = 0.04;
const STACK_MIN_SCALE = 0.88;
const STACK_SHIFT_STEP = 64;
const STACK_TRANSITION = "transform 0.3s cubic-bezier(0.23, 1, 0.32, 1), border-radius 0.3s";

/** Transform origin = the edge the drawer is attached to, so it shrinks toward that edge. */
const STACK_ORIGIN = {
  right: "right center",
  left: "left center",
  top: "top center",
  bottom: "bottom center",
};

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
 *   titleExtra?: import("react").ReactNode;
 *   documentBranch?: Record<string, unknown> | null;
 *   headerExtra?: import("react").ReactNode;
 *   className?: string;
 *   afterOpenChange?: (open: boolean) => void;
 *   autoFocusFirstField?: boolean;
 * }} props
 */
export default function ResourceCrudDrawer({
  title,
  recordName = null,
  statusActive = null,
  statusActiveLabel,
  statusInactiveLabel,
  showExpand = true,
  titleExtra = null,
  documentBranch = null,
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
  className = undefined,
  afterOpenChange: afterOpenChangeProp,
  autoFocusFirstField = true,
}) {
  const locale = useLocale();
  const placement = placementOverride ?? (isRtlLocale(locale) ? "left" : "right");
  const hostPresence = useDrawerHostPresence();
  const [expanded, setExpanded] = useState(false);
  const bodyRef = useRef(/** @type {HTMLDivElement | null} */ (null));

  const handleToggleExpand = useCallback(() => {
    setExpanded((v) => !v);
  }, []);

  const handleClose = useCallback(() => {
    setExpanded(false);
    requestClose();
  }, [requestClose]);

  const scheduleFocusFirstField = useCallback(() => {
    if (!autoFocusFirstField) return;
    window.setTimeout(() => {
      focusFirstDrawerField(bodyRef.current);
    }, 50);
  }, [autoFocusFirstField]);

  const handleAfterOpenChange = useCallback(
    (nextOpen) => {
      hostPresence?.afterOpenChange?.(nextOpen);
      afterOpenChangeProp?.(nextOpen);
      if (nextOpen && !showDetailLoading && !detailLoadFailed) {
        scheduleFocusFirstField();
      }
    },
    [
      hostPresence,
      afterOpenChangeProp,
      showDetailLoading,
      detailLoadFailed,
      scheduleFocusFirstField,
    ],
  );

  // When detail loading finishes after open, move focus into the first field.
  useEffect(() => {
    if (!open || !autoFocusFirstField || showDetailLoading || detailLoadFailed) return;
    scheduleFocusFirstField();
  }, [open, autoFocusFirstField, showDetailLoading, detailLoadFailed, scheduleFocusFirstField]);

  const isVertical = placement === "top" || placement === "bottom";
  const drawerSize = useMemo(() => {
    if (!isVertical && open && expanded) return "100%";
    return size;
  }, [open, expanded, size, isVertical]);

  // Depth effect works for any placement: shrink toward the drawer's own edge; side drawers
  // that are not full width also shift away from it so their edge peeks out behind the top one.
  const stackDepth = useDrawerStackDepth();
  const stackSectionStyle = useMemo(() => {
    /** @type {import("react").CSSProperties} */
    const style = { transition: STACK_TRANSITION, transformOrigin: STACK_ORIGIN[placement] };
    if (stackDepth <= 0) return style;
    const scale = Math.max(STACK_MIN_SCALE, 1 - STACK_SCALE_STEP * stackDepth);
    const canShift = !isVertical && drawerSize !== "100%";
    const shift = canShift ? STACK_SHIFT_STEP * stackDepth * (placement === "right" ? -1 : 1) : 0;
    style.transform = `${shift ? `translateX(${shift}px) ` : ""}scale(${scale})`;
    style.borderRadius = 8;
    style.overflow = "hidden";
    return style;
  }, [stackDepth, placement, isVertical, drawerSize]);

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
      titleExtra={
        documentBranch ? (
          <span className="inline-flex items-center gap-2">
            {titleExtra}
            <DocumentBranchTag record={documentBranch} />
          </span>
        ) : (
          titleExtra
        )
      }
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
      afterOpenChange={handleAfterOpenChange}
      destroyOnClose
      maskClosable={!submitting}
      closable={false}
      footer={footer}
      zIndex={zIndex}
      className={[
        isVertical ? "resource-crud-drawer-top" : null,
        showDetailLoading ? "resource-crud-drawer-loading" : null,
        className,
      ]
        .filter(Boolean)
        .join(" ") || undefined}
      styles={{ section: stackSectionStyle }}
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
          <div ref={bodyRef} className="relative min-h-[120px]">{children}</div>
        )
      )}
    </Drawer>
  );
}
