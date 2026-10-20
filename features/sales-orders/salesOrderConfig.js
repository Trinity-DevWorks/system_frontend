import { createCommercialApi } from "@/features/sales-documents/api/commercialDocuments.api";

const api = createCommercialApi("sales-orders");

export const salesOrderConfig = {
  kind: "order",
  featureId: "salesOrders",
  tableId: "sales-orders",
  translationNs: "SalesOrders",
  permission: "sales_orders",
  listKey: ["tenant", "sales-orders"],
  detailPrefix: ["tenant", "sales-orders", "detail"],
  numberField: "order_number",
  dateField: "order_date",
  extraDateField: "requested_date",
  includeWarehouse: true,
  statuses: ["draft", "confirmed", "partially_invoiced", "invoiced", "cancelled"],
  api,
};
