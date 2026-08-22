"use client";

import { FEATURES, ROUTES } from "@/features/registry";
import { useRouter } from "@/i18n/navigation";
import { usePermissions } from "@/lib/permissions";
import { Spin } from "antd";
import { useEffect } from "react";

const SETTINGS_PAGES = FEATURES.filter((feature) => feature.section === "settings" && feature.nav !== false);

/**
 * `/main/settings` is only a landing hop. Send the user to the first settings
 * page they can view so the sidebar and the route guard stay aligned.
 */
export default function SettingsIndexPage() {
  const router = useRouter();
  const { can, isLoading, isReady } = usePermissions();

  useEffect(() => {
    if (isLoading) return;

    const firstAllowed = SETTINGS_PAGES.find(
      (feature) => !feature.permission || (isReady && can(feature.permission, "view")),
    );
    router.replace(firstAllowed?.path ?? ROUTES.overview);
  }, [can, isLoading, isReady, router]);

  return (
    <div className="flex min-h-40 items-center justify-center">
      <Spin />
    </div>
  );
}
