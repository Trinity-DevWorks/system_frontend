"use client";

import { CENTRAL_FEATURES, CENTRAL_HOME_PATH } from "@/features/central/registry";
import { useRouter } from "@/i18n/navigation";
import { useCentralPermissions } from "@/lib/central-permissions";
import { Spin } from "antd";
import { useEffect } from "react";

const SETTINGS_PAGES = CENTRAL_FEATURES.filter((feature) => feature.section === "settings" && feature.nav !== false);

/**
 * `/central/settings` is only a landing hop. Send the user to the first settings
 * page they can view so the sidebar and the route guard stay aligned.
 */
export default function CentralSettingsIndexPage() {
  const router = useRouter();
  const { can, isLoading, isReady } = useCentralPermissions();

  useEffect(() => {
    if (isLoading) return;

    const firstAllowed = SETTINGS_PAGES.find(
      (feature) => !feature.permission || (isReady && can(feature.permission, "view")),
    );
    router.replace(firstAllowed?.path ?? CENTRAL_HOME_PATH);
  }, [can, isLoading, isReady, router]);

  return (
    <div className="flex min-h-40 items-center justify-center">
      <Spin />
    </div>
  );
}
