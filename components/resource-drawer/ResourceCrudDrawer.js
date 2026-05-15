"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { isRtlLocale } from "@/i18n/constants";
import { Drawer, Skeleton } from "antd";
import { useLocale } from "next-intl";

/**
 * Shared drawer chrome: loading / detail error / body, same for every CRUD resource drawer.
 * @param {{
 *   title: import("react").ReactNode;
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
 * }} props
 */
export default function ResourceCrudDrawer({
  title,
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
}) {
  const locale = useLocale();
  const placement = isRtlLocale(locale) ? "left" : "right";

  return (
    <Drawer
      title={title}
      size={size}
      placement={placement}
      open={open}
      onClose={requestClose}
      destroyOnClose
      maskClosable={!submitting}
      closable={!submitting}
      footer={footer}
    >
      {showDetailLoading ? (
        <Skeleton active paragraph={{ rows: skeletonParagraphRows }} />
      ) : detailLoadFailed ? (
        <p className="text-sm text-red-600 dark:text-red-400">{getLocalizedApiErrorMessage(tApiErrors, detailError)}</p>
      ) : (
        children
      )}
    </Drawer>
  );
}
