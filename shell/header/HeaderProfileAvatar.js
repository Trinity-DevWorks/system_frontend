"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";

import { useAuthMe } from "@/lib/auth-me";
import { useBlobObjectUrl } from "@/lib/use-blob-object-url";
import {
  userAvatarPreviewQueryKey,
  viewUserAttachmentBlob,
} from "@/features/users";
import { UserOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Avatar, theme } from "antd";

/**
 * Circular mark for the shell profile control: avatar photo or default icon.
 *
 * @param {{ size?: number }} [props]
 */
export default function HeaderProfileAvatar({ size = 36 }) {
  const { token } = theme.useToken();
  const { me } = useAuthMe();

  const userId =
    me?.id != null && me.id !== ""
      ? String(/** @type {{ id: unknown }} */ (me).id)
      : null;
  const avatar =
    me?.avatar && typeof me.avatar === "object"
      ? /** @type {{ id?: unknown }} */ (me.avatar)
      : null;
  const avatarId = avatar?.id != null ? String(avatar.id) : null;

  const previewQuery = useQuery({
    queryKey: userAvatarPreviewQueryKey(avatarId),
    queryFn: () =>
      viewUserAttachmentBlob(
        /** @type {string} */ (userId),
        /** @type {string} */ (avatarId),
      ),
    enabled: Boolean(userId && avatarId),
    staleTime: QUERY_STALE_TIME.infinite,
    refetchOnWindowFocus: false,
  });

  const objectUrl = useBlobObjectUrl(previewQuery.data);

  if (objectUrl) {
    return (
      <Avatar
        size={size}
        src={objectUrl}
        alt=""
        className="block shrink-0"
        style={{ verticalAlign: "top" }}
      />
    );
  }

  return (
    <Avatar
      size={size}
      icon={<UserOutlined />}
      className="block shrink-0"
      style={{
        backgroundColor: token.colorFillSecondary,
        color: token.colorTextSecondary,
        verticalAlign: "top",
      }}
    />
  );
}
