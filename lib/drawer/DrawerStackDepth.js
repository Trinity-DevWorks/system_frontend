/**
 * How many stacked drawers are open above the current drawer.
 * Provided by GlobalDrawerHost / StackedDrawerHost; read by ResourceCrudDrawer
 * to draw the "pushed back" look when other drawers sit on top of it.
 */

"use client";

import { createContext, useContext } from "react";

const DrawerStackDepthContext = createContext(0);

/**
 * @param {{ depth: number, children: import("react").ReactNode }} props
 */
export function DrawerStackDepthProvider({ depth, children }) {
  return <DrawerStackDepthContext.Provider value={depth}>{children}</DrawerStackDepthContext.Provider>;
}

export function useDrawerStackDepth() {
  return useContext(DrawerStackDepthContext);
}
