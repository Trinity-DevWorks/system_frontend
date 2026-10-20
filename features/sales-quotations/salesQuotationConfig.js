import { createCommercialApi } from "@/features/sales-documents/api/commercialDocuments.api";

const api = createCommercialApi("sales-quotations");

export const salesQuotationConfig = {
  kind: "quotation",
  featureId: "salesQuotations",
  tableId: "sales-quotations",
  translationNs: "SalesQuotations",
  permission: "sales_quotations",
  listKey: ["tenant", "sales-quotations"],
  detailPrefix: ["tenant", "sales-quotations", "detail"],
  numberField: "quotation_number",
  dateField: "quotation_date",
  extraDateField: "valid_until",
  includeWarehouse: false,
  statuses: ["draft", "sent", "accepted", "rejected", "expired", "converted"],
  api,
};
