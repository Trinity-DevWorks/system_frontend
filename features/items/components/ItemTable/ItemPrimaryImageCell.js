"use client";

import { fetchAttachmentBlob } from "@/lib/attachments/attachmentBlob";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { useBlobObjectUrl } from "@/lib/use-blob-object-url";
import { FileImageOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Image, Spin } from "antd";
import { ITEMS_LIST_QUERY_KEY } from "../../queries/itemsQueryKeys";

/**
 * @param {{ itemId: number; primaryImage?: { id: number } | null }} props
 */
export default function ItemPrimaryImageCell({ itemId, primaryImage }) {
  const attachmentId = primaryImage?.id;

  const imageQuery = useQuery({
    queryKey: [...ITEMS_LIST_QUERY_KEY, itemId, "attachments", attachmentId, "thumb"],
    queryFn: () => fetchAttachmentBlob(`items/${itemId}/attachments/${attachmentId}`, "view"),
    enabled: attachmentId != null,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const objectUrl = useBlobObjectUrl(imageQuery.data);

  if (!attachmentId) {
    return (
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md border border-dashed border-neutral-300 bg-neutral-50 text-neutral-400 dark:border-neutral-600 dark:bg-neutral-800">
        <FileImageOutlined />
      </div>
    );
  }

  if (imageQuery.isPending && !objectUrl) {
    return (
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800">
        <Spin size="small" />
      </div>
    );
  }

  if (imageQuery.isError || !objectUrl) {
    return (
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50 text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800">
        <FileImageOutlined />
      </div>
    );
  }

  return (
    <Image
      src={objectUrl}
      alt=""
      width={40}
      height={40}
      className="mx-auto !h-10 !w-10 rounded-md border border-neutral-200 object-cover dark:border-neutral-700"
      preview={false}
    />
  );
}
