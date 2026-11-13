/**
 * Feature id → drawer. Used by the URL drawer (GlobalDrawerHost) and by stacked drawers
 * (StackedDrawerHost, opened with `openStackedDrawer`).
 */

"use client";

import AssetCategoryDrawer from "@/features/asset-categories/components/AssetCategoryDrawer";
import AccountDrawer from "@/features/accounting/components/AccountDrawer";
import FixedAssetDrawer from "@/features/fixed-assets/components/FixedAssetDrawer";
import JournalEntryDrawer from "@/features/accounting/components/JournalEntryDrawer";
import AuditLogDetailDrawer from "@/features/audit-log/components/AuditLogDetailDrawer/AuditLogDetailDrawer";
import BranchDrawer from "@/features/branches/components/BranchDrawer/BranchDrawer";
import BrandDrawer from "@/features/brands/components/BrandDrawer/BrandDrawer";
import ItemAttributeDrawer from "@/features/item-attributes/components/ItemAttributeDrawer/ItemAttributeDrawer";
import CategoryDrawer from "@/features/categories/components/CategoryDrawer/CategoryDrawer";
import CurrencyDrawer from "@/features/currencies/components/CurrencyDrawer/CurrencyDrawer";
import CustomerGroupDrawer from "@/features/customer-groups/components/CustomerGroupDrawer/CustomerGroupDrawer";
import PriceListDrawer from "@/features/price-lists/components/PriceListDrawer/PriceListDrawer";
import PriceChangeDrawer from "@/features/price-changes/components/PriceChangeDrawer";
import LandedCostDrawer from "@/features/landed-costs/components/LandedCostDrawer/LandedCostDrawer";
import DeliveryNoteDrawer from "@/features/delivery-notes/components/DeliveryNoteDrawer/DeliveryNoteDrawer";
import CashBankAccountDrawer from "@/features/cash-bank-accounts/components/CashBankAccountDrawer/CashBankAccountDrawer";
import TreasuryTransferDrawer from "@/features/treasury-transfers/components/TreasuryTransferDrawer/TreasuryTransferDrawer";
import ExpenseVoucherDrawer from "@/features/expense-vouchers/components/ExpenseVoucherDrawer/ExpenseVoucherDrawer";
import RecurringTemplateDrawer from "@/features/recurring-entries/components/RecurringTemplateDrawer/RecurringTemplateDrawer";
import DeferralScheduleDrawer from "@/features/deferral-schedules/components/DeferralScheduleDrawer/DeferralScheduleDrawer";
import BudgetDrawer from "@/features/budgets/components/BudgetDrawer";
import CustomerDrawer from "@/features/customers/components/CustomerDrawer/CustomerDrawer";
import ItemDrawer from "@/features/items/components/ItemDrawer/ItemDrawer";
import PaymentMethodDrawer from "@/features/payment-methods/components/PaymentMethodDrawer/PaymentMethodDrawer";
import PaymentTermDrawer from "@/features/payment-terms/components/PaymentTermDrawer/PaymentTermDrawer";
import RoleDrawer from "@/features/roles/components/RoleDrawer/RoleDrawer";
import SalesmanDrawer from "@/features/salesmen/components/SalesmanDrawer/SalesmanDrawer";
import AdjustmentReasonDrawer from "@/features/stock/components/AdjustmentReasonDrawer/AdjustmentReasonDrawer";
import BundleExplosionDrawer from "@/features/stock/components/BundleExplosionDrawer/BundleExplosionDrawer";
import GoodsReceiptDrawer from "@/features/stock/components/GoodsReceiptDrawer/GoodsReceiptDrawer";
import OpeningStockDrawer from "@/features/stock/components/OpeningStockDrawer/OpeningStockDrawer";
import ProductionDrawer from "@/features/stock/components/ProductionDrawer/ProductionDrawer";
import PurchaseOrderDrawer from "@/features/stock/components/PurchaseOrderDrawer/PurchaseOrderDrawer";
import PurchasingAlertViewDrawer from "@/features/stock/components/PurchasingAlertViewDrawer/PurchasingAlertViewDrawer";
import StockAdjustmentDocumentDrawer from "@/features/stock/components/StockAdjustmentDocumentDrawer/StockAdjustmentDocumentDrawer";
import StockRevaluationDocumentDrawer from "@/features/stock/components/StockRevaluationDocumentDrawer/StockRevaluationDocumentDrawer";
import StockCountDrawer from "@/features/stock/components/StockCountDrawer/StockCountDrawer";
import StockMovementViewDrawer from "@/features/stock/components/StockMovementViewDrawer/StockMovementViewDrawer";
import StockTransferDrawer from "@/features/stock/components/StockTransferDrawer/StockTransferDrawer";
import { isUuidLikeEntityId } from "@/features/stock/utils/resolveStockMovementViewTarget";
import SupplierGroupDrawer from "@/features/supplier-groups/components/SupplierGroupDrawer/SupplierGroupDrawer";
import SupplierDrawer from "@/features/suppliers/components/SupplierDrawer/SupplierDrawer";
import UnitGroupDrawer from "@/features/unit-groups/components/UnitGroupDrawer/UnitGroupDrawer";
import UnitOfMeasurementDrawer from "@/features/unit-of-measurements/components/UnitOfMeasurementDrawer/UnitOfMeasurementDrawer";
import UserDrawer from "@/features/users/components/UserDrawer/UserDrawer";
import VatGroupDrawer from "@/features/vat-groups/components/VatGroupDrawer/VatGroupDrawer";
import SalesInvoiceDrawer from "@/features/sales-invoices/components/SalesInvoiceDrawer/SalesInvoiceDrawer";
import SalesQuotationDrawer from "@/features/sales-quotations/components/SalesQuotationDrawer";
import SalesOrderDrawer from "@/features/sales-orders/components/SalesOrderDrawer";
import SalesCreditNoteDrawer from "@/features/sales-credit-notes/components/SalesCreditNoteDrawer/SalesCreditNoteDrawer";
import CustomerReceiptDrawer from "@/features/customer-receipts/components/CustomerReceiptDrawer/CustomerReceiptDrawer";
import CustomerRefundDrawer from "@/features/customer-refunds/components/CustomerRefundDrawer/CustomerRefundDrawer";
import SupplierPaymentDrawer from "@/features/supplier-payments/components/SupplierPaymentDrawer/SupplierPaymentDrawer";
import SupplierRefundDrawer from "@/features/supplier-refunds/components/SupplierRefundDrawer/SupplierRefundDrawer";
import PurchaseInvoiceDrawer from "@/features/purchase-invoices/components/PurchaseInvoiceDrawer/PurchaseInvoiceDrawer";
import PurchaseDebitNoteDrawer from "@/features/purchase-debit-notes/components/PurchaseDebitNoteDrawer/PurchaseDebitNoteDrawer";
import WarehouseDrawer from "@/features/warehouses/components/WarehouseDrawer/WarehouseDrawer";
import { normalizeEntityId, parseNumericEntityId } from "@/lib/entityId";

/**
 * @typedef {{
 *   open: boolean,
 *   mode: "create" | "edit" | "view",
 *   recordId: string | number | null,
 *   tableSeed: Record<string, unknown> | null,
 *   createSeed: unknown,
 *   onClose: () => void,
 *   onCreated?: (record: Record<string, unknown>) => void,
 *   onCreateSuccess?: (record: Record<string, unknown>) => void,
 *   extras?: Record<string, unknown> | null,
 * }} GlobalDrawerRenderProps
 *
 * @typedef {{
 *   allowCreate?: boolean,
 *   Component?: import("react").ComponentType<Record<string, unknown>>,
 *   mapProps?: (props: GlobalDrawerRenderProps) => Record<string, unknown>,
 *   resolve?: (props: GlobalDrawerRenderProps) => {
 *     Component: import("react").ComponentType<Record<string, unknown>>,
 *     props: Record<string, unknown>,
 *   } | null,
 * }} DrawerRegistration
 */

/**
 * @param {GlobalDrawerRenderProps} p
 * @returns {number | null}
 */
function numId(p) {
  if (p.mode === "create" || p.recordId == null) return null;
  return parseNumericEntityId(p.recordId);
}

/**
 * @param {GlobalDrawerRenderProps} p
 * @returns {string | null}
 */
function strId(p) {
  if (p.mode === "create" || p.recordId == null) return null;
  return normalizeEntityId(p.recordId);
}

/**
 * @param {import("react").ComponentType<Record<string, unknown>>} Component
 * @param {string} idKey
 * @param {{ numeric?: boolean, seedKey?: string, createSeed?: boolean, extra?: (p: GlobalDrawerRenderProps) => Record<string, unknown>, allowCreate?: boolean }} [opts]
 * @returns {DrawerRegistration}
 */
function crud(Component, idKey, opts = {}) {
  const seedKey = opts.seedKey ?? "tableSeedRecord";
  return {
    allowCreate: opts.allowCreate !== false,
    Component,
    mapProps: (p) => {
      /** @type {Record<string, unknown>} */
      const props = {
        open: p.open,
        mode: p.mode,
        [idKey]: opts.numeric ? numId(p) : strId(p),
        [seedKey]: p.mode === "create" ? null : p.tableSeed,
        onClose: p.onClose,
        onCreated: p.onCreated,
        onCreateSuccess: p.onCreateSuccess,
      };
      if (opts.createSeed) {
        props.createSeed = p.mode === "create" ? p.createSeed : null;
      }
      if (opts.extra) {
        Object.assign(props, opts.extra(p));
      }
      return props;
    },
  };
}

/** @type {Readonly<Record<string, DrawerRegistration>>} */
export const DRAWER_REGISTRY = {
  brands: crud(BrandDrawer, "brandId", {
    numeric: true,
    seedKey: "editSeedRecord",
  }),
  itemAttributes: crud(ItemAttributeDrawer, "itemAttributeId", {
    numeric: true,
    seedKey: "editSeedRecord",
  }),
  categories: crud(CategoryDrawer, "categoryId", {
    numeric: true,
    seedKey: "editSeedRecord",
  }),
  vatGroups: crud(VatGroupDrawer, "vatGroupId", { numeric: true }),
  unitGroups: crud(UnitGroupDrawer, "unitGroupId", { numeric: true }),
  unitOfMeasurements: crud(UnitOfMeasurementDrawer, "unitOfMeasurementId", {
    numeric: true,
  }),
  warehouses: crud(WarehouseDrawer, "warehouseId", { numeric: true }),
  currencies: crud(CurrencyDrawer, "currencyId", { numeric: true }),
  paymentMethods: crud(PaymentMethodDrawer, "paymentMethodId", {
    numeric: true,
  }),
  paymentTerms: crud(PaymentTermDrawer, "paymentTermId", { numeric: true }),
  salesmen: crud(SalesmanDrawer, "salesmanId"),
  items: crud(ItemDrawer, "itemId", {
    seedKey: "editSeedRecord",
    extra: (p) => ({ onSaveAndNew: p.extras?.onSaveAndNew }),
  }),
  customerGroups: crud(CustomerGroupDrawer, "customerGroupId", {
    numeric: true,
  }),
  priceLists: crud(PriceListDrawer, "priceListId", { numeric: true }),
  landedCosts: crud(LandedCostDrawer, "landedCostId", {
    extra: (p) => ({
      fromReceipt:
        p.mode === "create" && p.extras?.fromReceipt
          ? p.extras.fromReceipt
          : null,
    }),
  }),
  deliveryNotes: crud(DeliveryNoteDrawer, "deliveryNoteId", {
    extra: (p) => ({
      fromSalesOrderId:
        p.mode === "create" && typeof p.extras?.fromSalesOrderId === "string"
          ? p.extras.fromSalesOrderId
          : null,
    }),
  }),
  cashBankAccounts: crud(CashBankAccountDrawer, "cashBankAccountId", {
    numeric: true,
  }),
  treasuryTransfers: crud(TreasuryTransferDrawer, "treasuryTransferId"),
  expenseVouchers: crud(ExpenseVoucherDrawer, "expenseVoucherId"),
  recurringEntries: crud(RecurringTemplateDrawer, "recurringTemplateId", {
    createSeed: true,
  }),
  deferralSchedules: crud(DeferralScheduleDrawer, "deferralScheduleId"),
  budgets: crud(BudgetDrawer, "budgetId"),
  customers: crud(CustomerDrawer, "customerId"),
  salesQuotations: crud(SalesQuotationDrawer, "recordId"),
  salesOrders: crud(SalesOrderDrawer, "recordId"),
  salesInvoices: crud(SalesInvoiceDrawer, "invoiceId", { createSeed: true }),
  salesCreditNotes: crud(SalesCreditNoteDrawer, "noteId", {
    extra: (p) => ({
      fromInvoiceId:
        p.mode === "create" && typeof p.extras?.fromInvoiceId === "string"
          ? p.extras.fromInvoiceId
          : null,
    }),
  }),
  customerReceipts: crud(CustomerReceiptDrawer, "receiptId", {
    extra: (p) => ({
      fromInvoiceId:
        p.mode === "create" && typeof p.extras?.fromInvoiceId === "string"
          ? p.extras.fromInvoiceId
          : null,
    }),
  }),
  customerRefunds: crud(CustomerRefundDrawer, "refundId"),
  supplierPayments: crud(SupplierPaymentDrawer, "paymentId", {
    extra: (p) => ({
      fromInvoiceId:
        p.mode === "create" && typeof p.extras?.fromInvoiceId === "string"
          ? p.extras.fromInvoiceId
          : null,
    }),
  }),
  purchaseInvoices: crud(PurchaseInvoiceDrawer, "invoiceId", {
    createSeed: true,
  }),
  purchaseDebitNotes: crud(PurchaseDebitNoteDrawer, "noteId", {
    extra: (p) => ({
      fromInvoiceId:
        p.mode === "create" && typeof p.extras?.fromInvoiceId === "string"
          ? p.extras.fromInvoiceId
          : null,
    }),
  }),
  supplierRefunds: crud(SupplierRefundDrawer, "refundId"),
  accounts: crud(AccountDrawer, "accountId", {
    numeric: true,
    createSeed: true,
  }),
  assetCategories: crud(AssetCategoryDrawer, "categoryId", { numeric: true }),
  fixedAssets: crud(FixedAssetDrawer, "assetId"),
  priceChanges: crud(PriceChangeDrawer, "documentId"),
  journalEntries: crud(JournalEntryDrawer, "entryId"),
  supplierGroups: crud(SupplierGroupDrawer, "supplierGroupId", {
    numeric: true,
  }),
  suppliers: crud(SupplierDrawer, "supplierId"),
  branches: crud(BranchDrawer, "branchId", { numeric: true }),
  users: crud(UserDrawer, "userId", { seedKey: "editSeedRecord" }),
  roles: crud(RoleDrawer, "roleId", {
    numeric: true,
    seedKey: "editSeedRecord",
  }),
  stockAdjustmentReasons: crud(AdjustmentReasonDrawer, "reasonId", {
    numeric: true,
  }),
  stockPurchaseOrders: crud(PurchaseOrderDrawer, "orderId", {
    createSeed: true,
  }),
  stockGoodsReceipts: crud(GoodsReceiptDrawer, "receiptId", {
    extra: (p) => ({
      fromPurchaseOrderId:
        p.mode === "create" && typeof p.extras?.fromPurchaseOrderId === "string"
          ? p.extras.fromPurchaseOrderId
          : null,
    }),
  }),
  stockOpeningStocks: crud(OpeningStockDrawer, "documentId"),
  stockAdjustments: crud(StockAdjustmentDocumentDrawer, "documentId", {
    createSeed: true,
  }),
  stockRevaluations: crud(StockRevaluationDocumentDrawer, "documentId", {
    createSeed: true,
  }),
  stockProductions: crud(ProductionDrawer, "documentId"),
  stockBundleExplosions: crud(BundleExplosionDrawer, "documentId"),
  stockStockCounts: crud(StockCountDrawer, "documentId"),
  stockTransfers: crud(StockTransferDrawer, "transferId"),
  stockPurchasingAlerts: {
    allowCreate: false,
    Component: PurchasingAlertViewDrawer,
    mapProps: (p) => ({
      open: p.open,
      replenishmentId: p.recordId,
      tableSeedRecord: p.tableSeed,
      onClose: p.onClose,
      canCreatePo: Boolean(p.extras?.canCreatePo),
      onCreatePo:
        typeof p.extras?.onCreatePo === "function"
          ? p.extras.onCreatePo
          : undefined,
    }),
  },
  stockMovements: {
    allowCreate: false,
    resolve: (p) => {
      if (p.recordId == null) return null;
      if (isUuidLikeEntityId(p.recordId)) {
        return {
          Component: StockTransferDrawer,
          props: {
            open: p.open,
            mode: "view",
            transferId: String(p.recordId),
            tableSeedRecord: null,
            onClose: p.onClose,
          },
        };
      }
      return {
        Component: StockMovementViewDrawer,
        props: {
          open: p.open,
          movementId:
            parseNumericEntityId(p.recordId) ?? normalizeEntityId(p.recordId),
          tableSeedRecord: p.tableSeed,
          onClose: p.onClose,
        },
      };
    },
  },
  auditLog: {
    allowCreate: false,
    Component: AuditLogDetailDrawer,
    mapProps: (p) => ({
      open: p.open,
      record: p.tableSeed,
      auditId: p.recordId,
      onClose: p.onClose,
    }),
  },
};

/**
 * @param {string | null | undefined} featureId
 * @returns {DrawerRegistration | null}
 */
export function getDrawerRegistration(featureId) {
  if (!featureId) return null;
  return DRAWER_REGISTRY[featureId] ?? null;
}

/**
 * @param {string} featureId
 * @param {GlobalDrawerRenderProps} input
 * @returns {{ Component: import("react").ComponentType<Record<string, unknown>>, props: Record<string, unknown> } | null}
 */
export function renderRegisteredDrawer(featureId, input) {
  const registration = getDrawerRegistration(featureId);
  if (!registration) return null;
  if (typeof registration.resolve === "function") {
    return registration.resolve(input);
  }
  if (!registration.Component || !registration.mapProps) return null;
  return {
    Component: registration.Component,
    props: registration.mapProps(input),
  };
}
