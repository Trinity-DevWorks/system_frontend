"use client";

import BrandLogo from "@/shared/components/brand/BrandLogo";
import { viewCompanyProfileAttachmentBlob } from "../api/companyProfileAttachments.api";
import { companyLogoPreviewQueryKey } from "../queries/companyProfile";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { useBlobObjectUrl } from "@/lib/use-blob-object-url";
import { useQuery } from "@tanstack/react-query";
import { Spin } from "antd";

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
    staleTime: QUERY_STALE_TIME.infinite,
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
