/**
 * URL helpers for resource drawers. Pages should not use this module for open state —
 * call `usePageDrawer` / `useGlobalDrawer` and let `GlobalDrawerHost` mount the drawer.
 */

export {
  RESOURCE_DRAWER_CREATE_TOKEN,
  buildForeignDrawerHref,
  buildResourceDrawerHref,
} from "@/lib/drawer/drawerUrl";
