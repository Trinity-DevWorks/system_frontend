"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Soft-refreshes server messages when locale JSON files change. Dev only. */
export default function DevI18nReload() {
  const router = useRouter();

  useEffect(() => {
    const source = new EventSource("/api/dev/i18n");
    source.onmessage = () => router.refresh();
    return () => source.close();
  }, [router]);

  return null;
}
