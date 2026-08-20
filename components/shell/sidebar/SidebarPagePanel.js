"use client";

import { SearchOutlined } from "@ant-design/icons";
import { Input } from "antd";
import { SHELL_CHROME_HEIGHT_PX } from "../shell-metrics";
import SidebarNavRow from "./SidebarNavRow";

/**
 * Page list for the module selected in the rail.
 *
 * @param {{
 *   title: string,
 *   searchValue: string,
 *   onSearchChange: (value: string) => void,
 *   searchPlaceholder: string,
 *   searchAria: string,
 *   sections: Array<{
 *     id: string,
 *     title?: string,
 *     action?: { label: string, onClick: () => void },
 *     items: Array<{ path: string, label: string, icon?: import("react").ReactNode, bookmarked: boolean }>,
 *   }>,
 *   emptyLabel: string,
 *   selectedPath: string | null,
 *   onNavigate: (path: string) => void,
 *   onToggleBookmark: (path: string) => void,
 *   addBookmarkAria: string,
 *   removeBookmarkAria: string,
 *   ariaLabel: string,
 * }} props
 */
export default function SidebarPagePanel({
  title,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchAria,
  sections,
  emptyLabel,
  selectedPath,
  onNavigate,
  onToggleBookmark,
  addBookmarkAria,
  removeBookmarkAria,
  ariaLabel,
}) {
  return (
    <div className="shell-panel">
      <div
        className="shell-panel-header"
        style={{ height: SHELL_CHROME_HEIGHT_PX, minHeight: SHELL_CHROME_HEIGHT_PX }}
      >
        <h2 className="shell-panel-title" title={title}>
          {title}
        </h2>
      </div>

      <div className="shell-panel-search">
        <Input
          allowClear
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchAria}
          prefix={<SearchOutlined />}
        />
      </div>

      <nav className="shell-panel-body app-hide-scrollbar" aria-label={ariaLabel}>
        {sections.length === 0 ? (
          <p className="shell-panel-empty">{emptyLabel}</p>
        ) : (
          sections.map((section) => (
            <section key={section.id} className="shell-panel-section">
              {section.title ? (
                <div className="shell-panel-section-head">
                  <span className="shell-panel-section-title">{section.title}</span>
                  {section.action ? (
                    <button
                      type="button"
                      className="shell-panel-section-action"
                      onClick={section.action.onClick}
                    >
                      {section.action.label}
                    </button>
                  ) : null}
                </div>
              ) : null}
              <div className="shell-panel-section-items">
                {section.items.map((item) => (
                  <SidebarNavRow
                    key={`${section.id}:${item.path}`}
                    icon={item.icon}
                    label={item.label}
                    active={item.path === selectedPath}
                    bookmarked={item.bookmarked}
                    onNavigate={() => onNavigate(item.path)}
                    onToggleBookmark={() => onToggleBookmark(item.path)}
                    addBookmarkAria={addBookmarkAria}
                    removeBookmarkAria={removeBookmarkAria}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </nav>
    </div>
  );
}
