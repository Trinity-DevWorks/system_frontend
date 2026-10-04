"use client";

import { useRef } from "react";
import { useServerInsertedHTML } from "next/navigation";
import { COLOR_MODE_BOOT_SCRIPT } from "@/lib/color-mode";
import { SIDEBAR_COLLAPSE_BOOT_SCRIPT } from "@/lib/sidebar-collapse";

/**
 * Color mode and sidebar state must be applied before first paint.
 * React 19 does not execute <script> tags rendered by a component, so these
 * are inserted into the document head as HTML instead.
 */
export default function DocumentBootScripts() {
  const inserted = useRef(false);

  useServerInsertedHTML(() => {
    if (inserted.current) return null;
    inserted.current = true;
    return (
      <>
        <script dangerouslySetInnerHTML={{ __html: COLOR_MODE_BOOT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: SIDEBAR_COLLAPSE_BOOT_SCRIPT }} />
      </>
    );
  });

  return null;
}
