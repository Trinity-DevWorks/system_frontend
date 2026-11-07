"use client";

import StockDocumentDrawerFooter from "@/features/stock/components/StockDocumentDrawerFooter";

/**
 * Same footer as the other inventory documents: Delete · Cancel, Save, Post while a draft;
 * Close, Print / PDF, Reverse once posted.
 *
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
 *   showReverse: boolean;
 *   showPdf: boolean;
 *   pdfLoading: boolean;
 *   printLoading: boolean;
 *   onSave: () => void;
 *   onPost: () => void;
 *   onDelete: () => void;
 *   onReverse: () => void;
 *   onPrint: () => void;
 *   onDownloadPdf: () => void;
 * }} props
 */
export default function LandedCostDrawerFooter(props) {
  return (
    <StockDocumentDrawerFooter
      {...props}
      primaryDisabled={props.postDisabled}
      showPrimary={props.showPost}
      primaryLabel={props.t("actionPost")}
      onPrimary={props.onPost}
    />
  );
}
