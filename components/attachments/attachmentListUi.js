"use client";

import {
  FileImageOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FileWordOutlined,
  PlayCircleOutlined,
  SoundOutlined,
} from "@ant-design/icons";

/**
 * @param {{ category?: string; className?: string }} props
 */
export function AttachmentCategoryIcon({ category, className }) {
  const props = { className };
  switch (category) {
    case "image":
      return <FileImageOutlined {...props} />;
    case "pdf":
      return <FilePdfOutlined {...props} />;
    case "audio":
      return <SoundOutlined {...props} />;
    case "video":
      return <PlayCircleOutlined {...props} />;
    case "document":
      return <FileWordOutlined {...props} />;
    case "text":
      return <FileTextOutlined {...props} />;
    default:
      return <FileOutlined {...props} />;
  }
}

/**
 * @param {string | undefined} category
 */
export function attachmentCategoryAccent(category) {
  switch (category) {
    case "image":
      return "bg-violet-500/10 text-violet-600 dark:text-violet-400";
    case "pdf":
      return "bg-red-500/10 text-red-600 dark:text-red-400";
    case "audio":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    case "video":
      return "bg-sky-500/10 text-sky-600 dark:text-sky-400";
    case "document":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "text":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    default:
      return "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400";
  }
}

/**
 * @param {string | undefined} category
 */
export function attachmentCategoryTagColor(category) {
  switch (category) {
    case "image":
      return "purple";
    case "pdf":
      return "red";
    case "audio":
      return "gold";
    case "video":
      return "cyan";
    case "document":
      return "blue";
    case "text":
      return "green";
    default:
      return "default";
  }
}

/**
 * @param {string | undefined} category
 */
export function attachmentCategoryLabel(category) {
  if (!category) return "File";
  return category.charAt(0).toUpperCase() + category.slice(1);
}
