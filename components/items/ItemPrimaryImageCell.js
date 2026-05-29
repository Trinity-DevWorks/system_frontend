"use client";

import { fetchAttachmentBlob } from "@/services/attachmentBlob";
import { FileImageOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Image, Spin } from "antd";

/**
 * @param {{ itemId: number; primaryImage?: { id: number } | null }} props
 */
export default function ItemPrimaryImageCell({ itemId, primaryImage }) {
  const attachmentId = primaryImage?.id;

  const imageQuery = useQuery({
    queryKey: ["tenant", "items", itemId, "attachments", attachmentId, "thumb"],
    queryFn: async () => {
      const blob = await fetchAttachmentBlob(`items/${itemId}/attachments/${attachmentId}`, "view");
      return URL.createObjectURL(blob);
    },
    enabled: attachmentId != null,
    staleTime: 5 * 60_000,
  });

  if (!attachmentId) {
    return (
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md border border-dashed border-neutral-300 bg-neutral-50 text-neutral-400 dark:border-neutral-600 dark:bg-neutral-800">
        <FileImageOutlined />
      </div>
    );
  }

  if (imageQuery.isPending) {
    return (
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800">
        <Spin size="small" />
      </div>
    );
  }

  if (imageQuery.isError || !imageQuery.data) {
    return (
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50 text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800">
        <FileImageOutlined />
      </div>
    );
  }

  return (
    <Image
      src={imageQuery.data}
      alt=""
      width={40}
      height={40}
      className="mx-auto !h-10 !w-10 rounded-md border border-neutral-200 object-cover dark:border-neutral-700"
      preview={false}
    />
  );
}
