"use client";

/**
 * Full notifications inbox page.
 *
 * What: Paginated All/Unread notification center opened from the popover "View all" link.
 * Used for: /main/notifications route.
 * Solves: Gives users a full list beyond the popover preview without leaving the app shell.
 */

import NotificationListItem from "@/components/shell/header/NotificationListItem";
import { navigateNotificationActionPath } from "@/lib/drawer/navigateNotificationActionPath";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  clearAllNotifications,
  clearReadNotifications,
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notificationsApi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Card,
  Empty,
  Pagination,
  Segmented,
  Skeleton,
  Spin,
  Typography,
  theme,
} from "antd";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

const PAGE_SIZE = 20;

function NotificationsPageInner() {
  const t = useTranslations("Notifications");
  const { message, modal } = App.useApp();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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

  // Separate from the filtered list so Clear buttons stay accurate on the Unread tab.
  const allCountQuery = useQuery({
    queryKey: ["tenant", "notifications", "all-count"],
    queryFn: () => fetchNotifications({ page: 1, per_page: 1 }),
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

  const clearReadMutation = useMutation({
    mutationFn: clearReadNotifications,
    onSuccess: (data) => {
      setPage(1);
      invalidate();
      message.success(t("clearReadSuccess", { count: Number(data?.deleted) || 0 }));
    },
    onError: () => message.error(t("clearError")),
  });

  const clearAllMutation = useMutation({
    mutationFn: clearAllNotifications,
    onSuccess: (data) => {
      setPage(1);
      invalidate();
      message.success(t("clearAllSuccess", { count: Number(data?.deleted) || 0 }));
    },
    onError: () => message.error(t("clearError")),
  });

  const unreadCount = unreadQuery.data ?? 0;
  const items = listQuery.data?.items ?? [];
  const total = Number(listQuery.data?.pagination?.total) || items.length;
  const allCount =
    Number(allCountQuery.data?.pagination?.total) ||
    (filter === "all" ? total : 0);
  const readCount = Math.max(0, allCount - unreadCount);
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
    navigateNotificationActionPath({
      actionPath: typeof row.action_path === "string" ? row.action_path : null,
      pathname,
      search: searchParams.toString(),
      router,
    });
  };

  const confirmClearRead = () => {
    if (readCount < 1) return;
    modal.confirm({
      title: t("clearReadConfirmTitle"),
      content: t("clearReadConfirmBody"),
      okText: t("clearConfirmOk"),
      cancelText: t("clearConfirmCancel"),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await clearReadMutation.mutateAsync();
        } catch {
          // Mutation feedback is shown by onError; close the confirmation.
        }
      },
    });
  };

  const confirmClearAll = () => {
    if (allCount < 1) return;
    modal.confirm({
      title: t("clearAllConfirmTitle"),
      content: t("clearAllConfirmBody"),
      okText: t("clearConfirmOk"),
      cancelText: t("clearConfirmCancel"),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await clearAllMutation.mutateAsync();
        } catch {
          // Mutation feedback is shown by onError; close the confirmation.
        }
      },
    });
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
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="text"
            size="small"
            disabled={unreadCount < 1}
            loading={markAllMutation.isPending}
            onClick={() => markAllMutation.mutate()}
          >
            {t("markAllRead")}
          </Button>
          <Button
            size="small"
            disabled={readCount < 1}
            loading={clearReadMutation.isPending}
            onClick={confirmClearRead}
          >
            {t("clearRead")}
          </Button>
          <Button
            danger
            size="small"
            disabled={allCount < 1}
            loading={clearAllMutation.isPending}
            onClick={confirmClearAll}
          >
            {t("clearAll")}
          </Button>
        </div>
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

export default function NotificationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-40 items-center justify-center p-2">
          <Spin />
        </div>
      }
    >
      <NotificationsPageInner />
    </Suspense>
  );
}
