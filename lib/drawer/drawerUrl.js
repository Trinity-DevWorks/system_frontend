/**
 * Shared drawer search-param contract.
 *
 * Same-page: ?drawer=&mode=  (no open)
 * Foreign:   ?open={FEATURES.id}&drawer=&mode=
 * Closed:    those params stripped (also from_po)
 */

import { featureById, featureForPath } from "@/features/registry";
import { normalizeEntityId } from "@/lib/entityId";

export const RESOURCE_DRAWER_CREATE_TOKEN = "new";
export const DRAWER_OPEN_PARAM = "open";
export const DRAWER_ID_PARAM = "drawer";
export const DRAWER_MODE_PARAM = "mode";
/** Extra GRN prefill param; always stripped with the drawer params. */
export const DRAWER_FROM_PO_PARAM = "from_po";

/**
 * @param {string} pathname
 * @returns {string | null}
 */
export function featureIdForPath(pathname) {
  return featureForPath(pathname)?.id ?? null;
}

/**
 * True when `open` names a FEATURES id that is not the current page.
 *
 * @param {string} pathname
 * @param {string | null | undefined} rawOpen
 */
export function isForeignDrawerOpen(pathname, rawOpen) {
  if (!rawOpen) return false;
  const currentId = featureIdForPath(pathname);
  return rawOpen !== currentId;
}

/**
 * @param {string} pathname App path without query
 * @param {string | number | null | undefined} id
 * @param {"view" | "edit" | "create"} [mode]
 * @returns {string}
 */
export function buildResourceDrawerHref(pathname, id, mode = "view") {
  const base = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (mode === "create" || id == null || id === "" || id === RESOURCE_DRAWER_CREATE_TOKEN) {
    return `${base}?${DRAWER_ID_PARAM}=${RESOURCE_DRAWER_CREATE_TOKEN}&${DRAWER_MODE_PARAM}=create`;
  }
  const normalized = normalizeEntityId(id);
  if (normalized == null) return base;
  return `${base}?${DRAWER_ID_PARAM}=${encodeURIComponent(normalized)}&${DRAWER_MODE_PARAM}=${mode}`;
}

/**
 * Foreign overlay on `pathname`. If `featureId` is this page, omits `open`.
 *
 * @param {string} pathname
 * @param {string} featureId FEATURES id
 * @param {string | number | null | undefined} id
 * @param {"view" | "edit" | "create"} [mode]
 * @returns {string}
 */
export function buildForeignDrawerHref(pathname, featureId, id, mode = "view") {
  const href = buildResourceDrawerHref(pathname, id, mode);
  const currentId = featureIdForPath(pathname);
  if (!featureId || featureId === currentId) return href;
  if (!featureById(featureId)) return href;

  const q = href.indexOf("?");
  const path = q === -1 ? href : href.slice(0, q);
  const params = new URLSearchParams(q === -1 ? "" : href.slice(q + 1));
  params.set(DRAWER_OPEN_PARAM, featureId);
  return `${path}?${params.toString()}`;
}

/**
 * @param {URLSearchParams} params
 */
export function stripDrawerSearchParams(params) {
  params.delete(DRAWER_OPEN_PARAM);
  params.delete(DRAWER_ID_PARAM);
  params.delete(DRAWER_MODE_PARAM);
  params.delete(DRAWER_FROM_PO_PARAM);
}

/**
 * @param {URLSearchParams} params
 * @param {{
 *   featureId: string,
 *   currentFeatureId: string | null,
 *   id?: string | number | null,
 *   mode?: "view" | "edit" | "create",
 * }} next
 */
export function applyDrawerSearchParams(params, next) {
  params.delete(DRAWER_FROM_PO_PARAM);
  const foreign = Boolean(next.featureId) && next.featureId !== next.currentFeatureId;
  if (foreign) {
    params.set(DRAWER_OPEN_PARAM, next.featureId);
  } else {
    params.delete(DRAWER_OPEN_PARAM);
  }

  const mode = next.mode ?? "view";
  const id = next.id;
  if (mode === "create" || id == null || id === "" || id === RESOURCE_DRAWER_CREATE_TOKEN) {
    params.set(DRAWER_ID_PARAM, RESOURCE_DRAWER_CREATE_TOKEN);
    params.set(DRAWER_MODE_PARAM, "create");
    return;
  }
  params.set(DRAWER_ID_PARAM, String(id));
  params.set(DRAWER_MODE_PARAM, mode);
}

/**
 * @param {string | null | undefined} rawMode
 * @param {"view" | "edit"} [fallback]
 * @returns {"create" | "edit" | "view"}
 */
export function parseDrawerMode(rawMode, fallback = "view") {
  if (rawMode === "create" || rawMode === "edit" || rawMode === "view") return rawMode;
  return fallback;
}
