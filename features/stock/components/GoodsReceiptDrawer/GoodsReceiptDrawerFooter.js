"use client";

import { Button } from "antd";
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
 *   showCreateInvoice?: boolean;
 *   onSave: () => void;
 *   onPost: () => void;
 *   onDelete: () => void;
 *   onCreateInvoice?: () => void;
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
      readOnlyExtras={
        props.showCreateInvoice ? (
          <Button type="primary" onClick={props.onCreateInvoice}>
            {props.t("actionCreatePurchaseInvoice")}
          </Button>
        ) : null
      }
    />
  );
}
