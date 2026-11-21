"use client";

import { Link } from "@/i18n/navigation";
import { StarFilled, StarOutlined } from "@ant-design/icons";

/**
 * Plain left-clicks stay in this tab. Modified clicks and the browser's own
 * context menu ("Open in new tab") follow the real href.
 *
 * @param {import("react").MouseEvent<HTMLAnchorElement>} event
 */
function isNewTabClick(event) {
  return (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  );
}

/**
 * One page row in the sidebar panel.
 *
 * A real link, not a button: the panel list is flat, and only an anchor gives the
 * browser a URL for "Open link in a new tab".
 *
 * @param {{
 *   href: string,
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
  href,
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
      <Link
        href={href}
        className="shell-nav-row-main"
        onClick={(event) => {
          if (isNewTabClick(event)) return;
          event.preventDefault();
          onNavigate();
        }}
        aria-current={active ? "page" : undefined}
        title={label}
      >
        {icon ? (
          <span className="shell-nav-row-icon" aria-hidden>
            {icon}
          </span>
        ) : null}
        <span className="shell-nav-row-label">{label}</span>
      </Link>
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
