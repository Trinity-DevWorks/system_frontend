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
 *   showReverse?: boolean;
 *   onSave: () => void;
 *   onPost: () => void;
 *   onDelete: () => void;
 *   onReverse?: () => void;
 * }} props
 */
export default function StockRevaluationDrawerFooter(props) {
  return (
    <StockDocumentDrawerFooter
      {...props}
      primaryDisabled={props.postDisabled}
      showPrimary={props.showPost}
      primaryLabel={props.t("actionPostRevaluation")}
      reverseLabel={props.t("actionReverseRevaluation")}
      onPrimary={props.onPost}
    />
  );
}
