"use client";

import StockDocumentDrawerFooter from "../StockDocumentDrawerFooter";

/**
 * @param {{
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   forceClose: () => void;
 *   requestClose: () => void;
 *   submitting: boolean;
 *   saveDisabled: boolean;
 *   postDisabled: boolean;
 *   showDelete: boolean;
 *   showPost: boolean;
 *   onSave: () => void;
 *   onPost: () => void;
 *   onDelete: () => void;
 * }} props
 */
export default function ProductionDrawerFooter(props) {
  return (
    <StockDocumentDrawerFooter
      {...props}
      primaryDisabled={props.postDisabled}
      showPrimary={props.showPost}
      primaryLabel={props.t("actionPostProduction")}
      onPrimary={props.onPost}
    />
  );
}
