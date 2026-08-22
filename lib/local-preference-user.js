"use client";

import {
  getLocalPreferenceUserId,
  LOCAL_PREFERENCE_USER_EVENT,
} from "@/lib/local-preference-scope";
import { useLayoutEffect, useState } from "react";

export {
  clearLocalPreferenceUserId,
  getLocalPreferenceUserId,
  localPreferenceUserIdFromMe,
  syncLocalPreferenceUserId,
} from "@/lib/local-preference-scope";

/**
 * Re-renders when login / logout changes the preference scope.
 */
export function useLocalPreferenceUserId() {
  const [userId, setUserId] = useState(getLocalPreferenceUserId);

  useLayoutEffect(() => {
    const sync = () => setUserId(getLocalPreferenceUserId());
    sync();
    window.addEventListener(LOCAL_PREFERENCE_USER_EVENT, sync);
    return () => window.removeEventListener(LOCAL_PREFERENCE_USER_EVENT, sync);
  }, []);

  return userId;
}
