"use client";

import { useCentralAuthMe } from "@/lib/central-auth-me";
import { UserOutlined } from "@ant-design/icons";
import { Avatar, Tag, Typography, theme } from "antd";

/**
 * Central users have no avatar attachment; show the default mark.
 *
 * @param {{ size?: number }} [props]
 */
export function CentralProfileAvatar({ size = 36 }) {
  const { token } = theme.useToken();
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

/**
 * Centered avatar, name, email and central role for the central profile dropdown.
 */
export default function CentralProfileIdentity() {
  const { me } = useCentralAuthMe();
  const name = typeof me?.name === "string" ? me.name.trim() : "";
  const email = typeof me?.email === "string" ? me.email.trim() : "";
  const role =
    me?.role && typeof me.role === "object" && typeof me.role.name === "string"
      ? me.role.name
      : "";

  return (
    <div className="flex flex-col items-center gap-1.5 px-4 py-3 text-center">
      <CentralProfileAvatar size={48} />
      <Typography.Text strong ellipsis className="block w-full max-w-full">
        {name || "\u2014"}
      </Typography.Text>
      {email ? (
        <Typography.Text type="secondary" ellipsis className="block w-full max-w-full text-xs">
          {email}
        </Typography.Text>
      ) : null}
      {role ? <Tag className="!m-0">{role}</Tag> : null}
    </div>
  );
}
