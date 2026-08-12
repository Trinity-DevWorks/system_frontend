"use client";

/**
 * Full notifications inbox page.
 *
 * What: Paginated All/Unread notification center opened from the popover "View all" link.
 * Used for: /main/notifications route.
 * Solves: Gives users a full list beyond the popover preview without leaving the app shell.
 */

import NotificationListItem from "@/components/shell/header/NotificationListItem";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notificationsApi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  Empty,
  Pagination,
  Segmented,
  Skeleton,
  Typography,
  theme,
} from "antd";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const t = useTranslations("Notifications");
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { token } = theme.useToken();
  /** @type {["all" | "unread", function]} */
  const [filter, setFilter] = useState(/** @type {"all" | "unread"} */ ("all"));
  const [page, setPage] = useState(1);

  const unreadQuery = useQuery({
    queryKey: ["tenant", "notifications", "unread-count"],
    queryFn: fetchUnreadNotificationCount,
    staleTime: 15_000,
  });

  const listQuery = useQuery({
    queryKey: ["tenant", "notifications", "page", filter, page],
    queryFn: () =>
      fetchNotifications({
        page,
        per_page: PAGE_SIZE,
        unread: filter === "unread",
      }),
    staleTime: 15_000,
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
  const total = Number(listQuery.data?.pagination?.total) || items.length;
  const loading = listQuery.isLoading && items.length === 0;

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

  const handleItemClick = async (row) => {
    if (!row?.id) return;
    if (!row.read) {
      try {
        await markReadMutation.mutateAsync(String(row.id));
      } catch {
        // continue
      }
    }
    const path = typeof row.action_path === "string" ? row.action_path : null;
    if (path && path !== pathname) {
      router.push(path);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl p-2">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 4 }}>
            {t("pageTitle")}
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            {t("pageSubtitle")}
          </Typography.Paragraph>
        </div>
        <button
          type="button"
          disabled={unreadCount < 1 || markAllMutation.isPending}
          onClick={() => markAllMutation.mutate()}
          className="border-0 bg-transparent p-0 text-sm font-medium disabled:opacity-40"
          style={{
            color: token.colorPrimary,
            cursor: unreadCount < 1 ? "not-allowed" : "pointer",
          }}
        >
          {t("markAllRead")}
        </button>
      </div>

      <div className="mb-3 max-w-xs">
        <Segmented
          block
          value={filter}
          options={segmentedOptions}
          onChange={(value) => {
            setFilter(/** @type {"all" | "unread"} */ (value));
            setPage(1);
          }}
        />
      </div>

      <Card
        styles={{
          body: { padding: 0 },
        }}
      >
        {loading ? (
          <div className="px-4 py-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 py-3">
                <Skeleton.Avatar active size={36} shape="square" />
                <div className="min-w-0 flex-1">
                  <Skeleton
                    active
                    title={{ width: "40%" }}
                    paragraph={{ rows: 1, width: "70%" }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-12">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                filter === "unread" ? t("emptyUnreadTitle") : t("emptyTitle")
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
      </Card>

      {total > PAGE_SIZE ? (
        <div className="mt-4 flex justify-end">
          <Pagination
            current={page}
            pageSize={PAGE_SIZE}
            total={total}
            onChange={setPage}
            showSizeChanger={false}
          />
        </div>
      ) : null}
    </div>
  );
}
