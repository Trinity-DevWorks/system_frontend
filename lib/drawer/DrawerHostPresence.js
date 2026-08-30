/**
 * Lets the host hear Ant Design's close animation without threading
 * `afterOpenChange` through every feature drawer. Nested lookup drawers
 * also fire this; the host ignores those while the URL drawer is still open.
 */

"use client";

import { createContext, useContext } from "react";

/** @type {import("react").Context<{ afterOpenChange: (open: boolean) => void } | null>} */
const DrawerHostPresenceContext = createContext(null);

export function DrawerHostPresenceProvider({ afterOpenChange, children }) {
  return (
    <DrawerHostPresenceContext.Provider value={{ afterOpenChange }}>
      {children}
    </DrawerHostPresenceContext.Provider>
  );
}

export function useDrawerHostPresence() {
  return useContext(DrawerHostPresenceContext);
}
