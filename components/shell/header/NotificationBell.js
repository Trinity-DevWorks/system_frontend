"use client";

/**
 * Header notification inbox popover (Phase 1 — polling).
 *
 * What: Mock-aligned panel — title, mark-all, All/Unread tabs, rows, view-all footer.
 * Used for: AppHeader chrome.
 * Solves: Delivers an enterprise notification menu matching the product design until Phase 2 Reverb.
 */

import NotificationListItem from "@/components/shell/header/NotificationListItem";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notificationsApi";
import { ArrowRightOutlined, BellOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Empty, Popover, Segmented, Skeleton, theme } from "antd";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

const POLL_MS = 45_000;
const PANEL_WIDTH = 400;
const LIST_MAX_HEIGHT = 360;
const shellIconBtnClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg shadow-sm";

export default function NotificationBell() {
  const t = useTranslations("Notifications");
  const tShell = useTranslations("Shell");
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { token } = theme.useToken();
  const [open, setOpen] = useState(false);
  /** @type {["all" | "unread", function]} */
  const [filter, setFilter] = useState(/** @type {"all" | "unread"} */ ("all"));

  const unreadQuery = useQuery({
    queryKey: ["tenant", "notifications", "unread-count"],
    queryFn: fetchUnreadNotificationCount,
    refetchInterval: POLL_MS,
    staleTime: 15_000,
  });

  const listQuery = useQuery({
    queryKey: ["tenant", "notifications", "list", filter],
    queryFn: () =>
      fetchNotifications({
        per_page: 12,
        unread: filter === "unread",
      }),
    refetchInterval: POLL_MS,
    staleTime: 15_000,
    enabled: open,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["tenant", "notifications"] });
  };

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: invalidate,
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: invalidate,
  });

  const unreadCount = unreadQuery.data ?? 0;
  const items = listQuery.data?.items ?? [];
  const loading = open && listQuery.isFetching && items.length === 0;

  const segmentedOptions = useMemo(
    () => [
      { label: t("filterAll"), value: "all" },
      {
        label: (
          <span className="inline-flex items-center gap-1.5">
            {t("filterUnread")}
            {unreadCount > 0 ? (
              <span
                className="inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold leading-[18px] text-white"
                style={{ background: token.colorPrimary }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </span>
        ),
        value: "unread",
      },
    ],
    [t, token.colorPrimary, unreadCount],
  );

  const onOpenChange = (nextOpen) => {
    setOpen(nextOpen);
    if (nextOpen) {
      listQuery.refetch();
      unreadQuery.refetch();
    }
  };

  const handleItemClick = async (row) => {
    if (!row?.id) return;

    if (!row.read) {
      try {
        await markReadMutation.mutateAsync(String(row.id));
      } catch {
        // Navigate anyway; badge refreshes on next poll.
      }
    }

    setOpen(false);
    const path = typeof row.action_path === "string" ? row.action_path : null;
    if (path && path !== pathname) {
      router.push(path);
    }
  };

  const handleViewAll = () => {
    setOpen(false);
    router.push("/main/notifications");
  };

  const panel = (
    <div
      style={{
        width: PANEL_WIDTH,
        maxWidth: "min(400px, calc(100vw - 24px))",
        margin: -4,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-3.5">
        <div
          className="text-[15px] font-semibold leading-5"
          style={{ color: token.colorText }}
        >
          {t("panelTitle")}
        </div>
        <button
          type="button"
          disabled={unreadCount < 1 || markAllMutation.isPending}
          onClick={() => markAllMutation.mutate()}
          className="border-0 bg-transparent p-0 text-xs font-medium disabled:opacity-40"
          style={{
            color: token.colorPrimary,
            cursor: unreadCount < 1 ? "not-allowed" : "pointer",
          }}
        >
          {t("markAllRead")}
        </button>
      </div>

      {/* All / Unread */}
      <div className="px-4 pb-3">
        <Segmented
          block
          size="middle"
          value={filter}
          options={segmentedOptions}
          onChange={(value) => setFilter(/** @type {"all" | "unread"} */ (value))}
        />
      </div>

      <div
        style={{
          height: 1,
          background: token.colorSplit,
        }}
      />

      {/* List */}
      <div className="overflow-y-auto" style={{ maxHeight: LIST_MAX_HEIGHT }}>
        {loading ? (
          <div className="flex flex-col gap-0 px-4 py-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3 py-3">
                <Skeleton.Avatar active size={36} shape="square" />
                <div className="min-w-0 flex-1">
                  <Skeleton
                    active
                    title={{ width: "50%" }}
                    paragraph={{ rows: 1, width: "80%" }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-10">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div className="space-y-1">
                  <div
                    className="text-sm font-medium"
                    style={{ color: token.colorText }}
                  >
                    {filter === "unread" ? t("emptyUnreadTitle") : t("emptyTitle")}
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: token.colorTextSecondary }}
                  >
                    {filter === "unread"
                      ? t("emptyUnreadDescription")
                      : t("emptyDescription")}
                  </div>
                </div>
              }
            />
          </div>
        ) : (
          <ul className="m-0 list-none p-0">
            {items.map((row, index) => (
              <NotificationListItem
                key={row.id}
                notification={row}
                onClick={handleItemClick}
                showDivider={index < items.length - 1}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: `1px solid ${token.colorSplit}`,
        }}
      >
        <button
          type="button"
          onClick={handleViewAll}
          className="flex w-full items-center justify-center gap-1.5 border-0 bg-transparent px-4 py-3 text-sm font-medium"
          style={{
            color: token.colorPrimary,
            cursor: "pointer",
          }}
        >
          {t("viewAll")}
          <ArrowRightOutlined style={{ fontSize: 11 }} />
        </button>
      </div>
    </div>
  );

  return (
    <Popover
      content={panel}
      trigger="click"
      placement="bottomRight"
      arrow={false}
      open={open}
      onOpenChange={onOpenChange}
      styles={{
        container: {
          padding: 4,
          borderRadius: 12,
          border: `1px solid ${token.colorBorderSecondary}`,
          boxShadow: token.boxShadowSecondary,
          background: token.colorBgElevated,
        },
      }}
    >
      <Button
        type="default"
        className={shellIconBtnClass}
        aria-label={tShell("notifications")}
        title={tShell("notifications")}
      >
        <Badge
          count={unreadCount > 0 ? unreadCount : 0}
          size="small"
          overflowCount={99}
          offset={[2, -2]}
          color={token.colorError}
        >
          <BellOutlined
            style={{ color: token.colorTextSecondary, fontSize: 16 }}
          />
        </Badge>
      </Button>
    </Popover>
  );
}
