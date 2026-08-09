"use client";

import BrandLogo from "@/components/brand/BrandLogo";
import { viewCompanyProfileAttachmentBlob } from "@/services/companyProfileAttachmentsApi";
import { useBlobObjectUrl } from "@/lib/use-blob-object-url";
import { useQuery } from "@tanstack/react-query";
import { Spin } from "antd";

/**
 * @param {string | null | undefined} logoId
 * @returns {unknown[]}
 */
export function companyLogoPreviewQueryKey(logoId) {
  return ["company-profile", "logo-preview", logoId ?? null];
}

/**
 * Tenant workspace mark: company logo when set, otherwise ERP product logo.
 *
 * @param {{
 *   logo?: { id: string, file_name?: string, mime_type?: string } | null;
 *   alt?: string;
 *   size?: number;
 *   className?: string;
 * }} props
 */
export default function WorkspaceBrandMark({
  logo = null,
  alt = "ERP",
  size = 28,
  className = "",
}) {
  const logoId = logo?.id ? String(logo.id) : null;

  const previewQuery = useQuery({
    queryKey: companyLogoPreviewQueryKey(logoId),
    queryFn: () => viewCompanyProfileAttachmentBlob(/** @type {string} */ (logoId)),
    enabled: Boolean(logoId),
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
  });

  const objectUrl = useBlobObjectUrl(previewQuery.data);

  if (!logoId) {
    return <BrandLogo size={size} className={className} />;
  }

  if (previewQuery.isPending && !objectUrl) {
    return (
      <span
        className={`inline-flex items-center justify-center ${className}`.trim()}
        style={{ width: size, height: size }}
        aria-hidden
      >
        <Spin size="small" />
      </span>
    );
  }

  if (!objectUrl) {
    return <BrandLogo size={size} className={className} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- blob preview URL
    <img
      src={objectUrl}
      alt={alt}
      width={size}
      height={size}
      className={`object-contain ${className}`.trim()}
    />
  );
}
