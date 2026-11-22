"use client";

import { createElement, useCallback, useState } from "react";
import SendDocumentEmailDialog from "../components/SendDocumentEmailDialog";

/**
 * Wires "Send by email" into a drawer or list page:
 *
 *   const email = useSendDocumentEmail();
 *   email.open("sales_invoice", id, number);
 *   ...
 *   {email.dialog}
 *
 * Show the action with the same rule as Print (`access.canPrint` + printable status);
 * statements with `canView`.
 *
 * @param {{ onQueued?: (target: import("../components/SendDocumentEmailDialog").EmailTarget) => void }} [options]
 *   Called once the email is queued, e.g. to refresh a status that changes when it is sent.
 */
export function useSendDocumentEmail({ onQueued } = {}) {
  const [target, setTarget] = useState(
    /** @type {import("../components/SendDocumentEmailDialog").EmailTarget | null} */ (null),
  );

  const open = useCallback(
    /**
     * @param {import("../api/documentEmail.api").DocumentEmailType} type
     * @param {string | number} id
     * @param {string | null} [number]
     * @param {import("../components/SendDocumentEmailDialog").EmailTarget["statement"]} [statement]
     */
    (type, id, number = null, statement = null) => setTarget({ type, id: String(id), number, statement }),
    [],
  );

  const dialog = createElement(SendDocumentEmailDialog, { target, onClose: () => setTarget(null), onQueued });

  return { open, dialog };
}
