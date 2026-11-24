"use client";

import { usePlatformBranding } from "@/lib/platform-branding";
import { FALLBACK_PLATFORM_LOGO } from "@/lib/platform-branding-shape";

/**
 * Product mark used in shell and auth chrome: the platform logo uploaded in central settings,
 * otherwise the bundled fallback image.
 *
 * @param {{
 *   size?: number;
 *   className?: string;
 *   priority?: boolean;
 * }} props
 */
export default function BrandLogo({ size = 28, className = "", priority = false }) {
  const { name, logoUrl } = usePlatformBranding();

  return (
    // eslint-disable-next-line @next/next/no-img-element -- logo is served by the central API host
    <img
      src={logoUrl ?? FALLBACK_PLATFORM_LOGO}
      alt={name}
      width={size}
      height={size}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      className={`object-contain ${className}`.trim()}
    />
  );
}
