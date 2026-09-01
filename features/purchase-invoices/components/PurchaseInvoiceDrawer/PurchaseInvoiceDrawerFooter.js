"use client";

import StockDocumentDrawerFooter from "@/features/stock/components/StockDocumentDrawerFooter";

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
export default function PurchaseInvoiceDrawerFooter(props) {
  return (
    <StockDocumentDrawerFooter
      {...props}
      saveLabel={props.t("actionSave")}
      primaryDisabled={props.postDisabled}
      showPrimary={props.showPost}
      primaryLabel={props.t("actionPost")}
      onPrimary={props.onPost}
    />
  );
}
