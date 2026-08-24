"use client";

import Image from "next/image";

/**
 * Product mark used in shell and auth chrome.
 *
 * @param {{
 *   size?: number;
 *   className?: string;
 *   priority?: boolean;
 * }} props
 */
export default function BrandLogo({ size = 28, className = "", priority = false }) {
  return (
    <Image
      src="/brand/erp-logo.png"
      alt="ERP"
      width={size}
      height={size}
      priority={priority}
      className={`object-contain ${className}`.trim()}
    />
  );
}
