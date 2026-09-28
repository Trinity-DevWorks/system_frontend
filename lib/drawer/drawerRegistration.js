/**
 * Registry-agnostic drawer registration helpers.
 * Shared by the tenant `DRAWER_REGISTRY` and the central drawer registry so the
 * central shell does not pull every tenant drawer into its bundle.
 */

import { normalizeEntityId, parseNumericEntityId } from "@/lib/entityId";

/**
 * @typedef {{
 *   open: boolean,
 *   mode: "create" | "edit" | "view",
 *   recordId: string | number | null,
 *   tableSeed: Record<string, unknown> | null,
 *   createSeed: unknown,
 *   onClose: () => void,
 *   onCreated?: (record: Record<string, unknown>) => void,
 *   extras?: Record<string, unknown> | null,
 * }} GlobalDrawerRenderProps
 *
 * @typedef {{
 *   allowCreate?: boolean,
 *   Component?: import("react").ComponentType<Record<string, unknown>>,
 *   mapProps?: (props: GlobalDrawerRenderProps) => Record<string, unknown>,
 *   resolve?: (props: GlobalDrawerRenderProps) => {
 *     Component: import("react").ComponentType<Record<string, unknown>>,
 *     props: Record<string, unknown>,
 *   } | null,
 * }} DrawerRegistration
 */

/**
 * @param {GlobalDrawerRenderProps} p
 * @returns {number | null}
 */
function numId(p) {
  if (p.mode === "create" || p.recordId == null) return null;
  return parseNumericEntityId(p.recordId);
}

/**
 * @param {GlobalDrawerRenderProps} p
 * @returns {string | null}
 */
function strId(p) {
  if (p.mode === "create" || p.recordId == null) return null;
  return normalizeEntityId(p.recordId);
}

/**
 * @param {import("react").ComponentType<Record<string, unknown>>} Component
 * @param {string} idKey
 * @param {{ numeric?: boolean, seedKey?: string, createSeed?: boolean, extra?: (p: GlobalDrawerRenderProps) => Record<string, unknown>, allowCreate?: boolean }} [opts]
 * @returns {DrawerRegistration}
 */
export function crud(Component, idKey, opts = {}) {
  const seedKey = opts.seedKey ?? "tableSeedRecord";
  return {
    allowCreate: opts.allowCreate !== false,
    Component,
    mapProps: (p) => {
      /** @type {Record<string, unknown>} */
      const props = {
        open: p.open,
        mode: p.mode,
        [idKey]: opts.numeric ? numId(p) : strId(p),
        [seedKey]: p.mode === "create" ? null : p.tableSeed,
        onClose: p.onClose,
        onCreated: p.onCreated,
      };
      if (opts.createSeed) {
        props.createSeed = p.mode === "create" ? p.createSeed : null;
      }
      if (opts.extra) {
        Object.assign(props, opts.extra(p));
      }
      return props;
    },
  };
}

/**
 * @param {Readonly<Record<string, DrawerRegistration>>} registry
 * @param {string | null | undefined} featureId
 * @returns {DrawerRegistration | null}
 */
export function lookupDrawerRegistration(registry, featureId) {
  if (!featureId) return null;
  return registry[featureId] ?? null;
}

/**
 * @param {Readonly<Record<string, DrawerRegistration>>} registry
 * @param {string} featureId
 * @param {GlobalDrawerRenderProps} input
 * @returns {{ Component: import("react").ComponentType<Record<string, unknown>>, props: Record<string, unknown> } | null}
 */
export function renderDrawerFromRegistry(registry, featureId, input) {
  const registration = lookupDrawerRegistration(registry, featureId);
  if (!registration) return null;
  if (typeof registration.resolve === "function") {
    return registration.resolve(input);
  }
  if (!registration.Component || !registration.mapProps) return null;
  return { Component: registration.Component, props: registration.mapProps(input) };
}
