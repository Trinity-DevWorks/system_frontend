"use client";

import { useAuthMe } from "@/lib/auth-me";
import { Typography } from "antd";
import HeaderProfileAvatar from "@/shell/header/HeaderProfileAvatar";

/**
 * Centered avatar, name, and email for the shell profile dropdown header.
 */
export default function HeaderProfileMenuIdentity() {
  const { me } = useAuthMe();
  const name = typeof me?.name === "string" ? me.name.trim() : "";
  const email = typeof me?.email === "string" ? me.email.trim() : "";

  return (
    <div className="flex flex-col items-center gap-1.5 px-4 py-3 text-center">
      <HeaderProfileAvatar size={48} />
      <Typography.Text strong ellipsis className="block w-full max-w-full">
        {name || "\u2014"}
      </Typography.Text>
      {email ? (
        <Typography.Text type="secondary" ellipsis className="block w-full max-w-full text-xs">
          {email}
        </Typography.Text>
      ) : null}
    </div>
  );
}
