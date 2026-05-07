"use client";

import { useSyncExternalStore } from "react";

/** @typedef {"keep" | "new" | "close"} DrawerSaveIntent */

/**
 * @param {string} storageKey
 * @returns {DrawerSaveIntent}
 */
export function readPersistedSaveIntent(storageKey) {
  if (typeof window === "undefined") return "close";
  try {
    const v = localStorage.getItem(storageKey);
    if (v === "keep" || v === "new" || v === "close") return v;
  } catch {
    /* ignore */
  }
  return "close";
}

/** @param {string} eventName */
export function notifyPersistedSaveIntent(eventName) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(eventName));
}

/**
 * @param {string} eventName
 * @param {() => void} onChange
 */
export function subscribePersistedSaveIntent(eventName, onChange) {
  if (typeof window === "undefined") return () => {};
  const handler = () => onChange();
  window.addEventListener(eventName, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(eventName, handler);
    window.removeEventListener("storage", handler);
  };
}

/**
 * Last-used create save action (Save / Save and new / Save and close), persisted in localStorage.
 * @param {string} storageKey
 * @param {string} changeEventName
 * @returns {DrawerSaveIntent}
 */
export function usePersistedSaveIntent(storageKey, changeEventName) {
  return useSyncExternalStore(
    (onStoreChange) => subscribePersistedSaveIntent(changeEventName, onStoreChange),
    () => readPersistedSaveIntent(storageKey),
    () => /** @type {DrawerSaveIntent} */ ("close"),
  );
}
