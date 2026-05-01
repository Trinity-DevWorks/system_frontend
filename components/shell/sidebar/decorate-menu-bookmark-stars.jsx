"use client";

import { StarFilled, StarOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { findNavLabelForPath } from "./main-nav";

/**
 * Adds an `extra` star control to each leaf whose `key` is a path (`/`…),
 * matching inventory-management-frontend sidebar behavior (toggle per route).
 *
 * @param {import("antd").MenuProps["items"]} items
 * @param {{
 *   labelSourceItems: import("antd").MenuProps["items"];
 *   bookmarkedPathsSet: Set<string>;
 *   onToggleBookmark: (path: string, label: string) => void;
 *   addBookmarkAria: string;
 *   removeBookmarkAria: string;
 * }} options
 * @returns {import("antd").MenuProps["items"]}
 */
export function decorateMenuItemsWithBookmarkStars(items, options) {
  const {
    labelSourceItems,
    bookmarkedPathsSet,
    onToggleBookmark,
    addBookmarkAria,
    removeBookmarkAria,
  } = options;

  const mapList = (list) =>
    (list ?? []).map((item) => mapItem(item)).filter(Boolean);

  function mapItem(item) {
    if (!item) return null;
    const hasChildren = item.children?.length > 0;
    if (hasChildren) {
      return { ...item, children: mapList(item.children) };
    }
    const key = item.key;
    if (typeof key !== "string" || !key.startsWith("/")) {
      return item;
    }
    const path = key;
    const bookmarked = bookmarkedPathsSet.has(path);
    const label =
      (typeof item.label === "string" && item.label) ||
      findNavLabelForPath(labelSourceItems, path) ||
      path;

    const extra = (
      <Button
        type="text"
        size="small"
        icon={bookmarked ? <StarFilled /> : <StarOutlined />}
        className="shell-nav-bookmark-star !h-7 !min-w-7 shrink-0 !px-0"
        aria-label={bookmarked ? removeBookmarkAria : addBookmarkAria}
        aria-pressed={bookmarked}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleBookmark(path, label);
        }}
      />
    );

    const mergedClass = [item.className, "shell-nav-leaf-with-bookmark"];
    if (bookmarked) mergedClass.push("shell-nav-leaf-bookmarked");

    return {
      ...item,
      className: mergedClass.filter(Boolean).join(" "),
      extra,
    };
  }

  return mapList(items);
}
