"use client";

import { StarFilled, StarOutlined } from "@ant-design/icons";

/**
 * One page row in the sidebar panel.
 *
 * Plain buttons rather than an Ant Design Menu: the panel list is flat, so rc-menu's
 * nesting, popups and unstable SSR ids buy nothing here.
 *
 * @param {{
 *   icon?: import("react").ReactNode,
 *   label: string,
 *   active?: boolean,
 *   bookmarked?: boolean,
 *   onNavigate: () => void,
 *   onToggleBookmark?: () => void,
 *   addBookmarkAria?: string,
 *   removeBookmarkAria?: string,
 * }} props
 */
export default function SidebarNavRow({
  icon,
  label,
  active = false,
  bookmarked = false,
  onNavigate,
  onToggleBookmark,
  addBookmarkAria,
  removeBookmarkAria,
}) {
  const className = [
    "shell-nav-row",
    active ? "is-active" : "",
    bookmarked ? "is-bookmarked" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className}>
      <button
        type="button"
        className="shell-nav-row-main"
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        title={label}
      >
        {icon ? (
          <span className="shell-nav-row-icon" aria-hidden>
            {icon}
          </span>
        ) : null}
        <span className="shell-nav-row-label">{label}</span>
      </button>
      {onToggleBookmark ? (
        <button
          type="button"
          className="shell-nav-row-star"
          aria-label={bookmarked ? removeBookmarkAria : addBookmarkAria}
          aria-pressed={bookmarked}
          onClick={onToggleBookmark}
        >
          {bookmarked ? <StarFilled /> : <StarOutlined />}
        </button>
      ) : null}
    </div>
  );
}
