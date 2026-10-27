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
 *   showPdf?: boolean;
 *   pdfLoading?: boolean;
 *   printLoading?: boolean;
 *   onSave: () => void;
 *   onPost: () => void;
 *   onDelete: () => void;
 *   onPrint?: () => void;
 *   onDownloadPdf?: () => void;
 * }} props
 */
export default function GoodsReceiptDrawerFooter(props) {
  return (
    <StockDocumentDrawerFooter
      {...props}
      primaryDisabled={props.postDisabled}
      showPrimary={props.showPost}
      primaryLabel={props.t("actionPostGrn")}
      onPrimary={props.onPost}
    />
  );
}
