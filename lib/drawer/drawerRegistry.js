/**
 * Feature id → list-page drawer. Nested lookup drawers stay inside their parent.
 */

"use client";

import AuditLogDetailDrawer from "@/features/audit-log/components/AuditLogDetailDrawer/AuditLogDetailDrawer";
import BranchDrawer from "@/features/branches/components/BranchDrawer/BranchDrawer";
import BrandDrawer from "@/features/brands/components/BrandDrawer/BrandDrawer";
import CategoryDrawer from "@/features/categories/components/CategoryDrawer/CategoryDrawer";
import CurrencyDrawer from "@/features/currencies/components/CurrencyDrawer/CurrencyDrawer";
import CustomerGroupDrawer from "@/features/customer-groups/components/CustomerGroupDrawer/CustomerGroupDrawer";
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
import PurchaseInvoiceDrawer from "@/features/purchase-invoices/components/PurchaseInvoiceDrawer/PurchaseInvoiceDrawer";
import InvoiceVerifierDrawer from "@/features/invoice-verifiers/components/InvoiceVerifierDrawer/InvoiceVerifierDrawer";
import WarehouseDrawer from "@/features/warehouses/components/WarehouseDrawer/WarehouseDrawer";
import { normalizeEntityId, parseNumericEntityId } from "@/lib/entityId";
import {
  crud,
  lookupDrawerRegistration,
  renderDrawerFromRegistry,
} from "@/lib/drawer/drawerRegistration";

export { crud };

/**
 * @typedef {import("@/lib/drawer/drawerRegistration").GlobalDrawerRenderProps} GlobalDrawerRenderProps
 * @typedef {import("@/lib/drawer/drawerRegistration").DrawerRegistration} DrawerRegistration
 */

/** @type {Readonly<Record<string, DrawerRegistration>>} */
export const DRAWER_REGISTRY = {
  brands: crud(BrandDrawer, "brandId", { numeric: true, seedKey: "editSeedRecord" }),
  categories: crud(CategoryDrawer, "categoryId", { numeric: true, seedKey: "editSeedRecord" }),
  vatGroups: crud(VatGroupDrawer, "vatGroupId", { numeric: true }),
  unitGroups: crud(UnitGroupDrawer, "unitGroupId", { numeric: true }),
  unitOfMeasurements: crud(UnitOfMeasurementDrawer, "unitOfMeasurementId", { numeric: true }),
  warehouses: crud(WarehouseDrawer, "warehouseId", { numeric: true }),
  currencies: crud(CurrencyDrawer, "currencyId", { numeric: true }),
  paymentMethods: crud(PaymentMethodDrawer, "paymentMethodId", { numeric: true }),
  paymentTerms: crud(PaymentTermDrawer, "paymentTermId", { numeric: true }),
  salesmen: crud(SalesmanDrawer, "salesmanId"),
  items: crud(ItemDrawer, "itemId", {
    seedKey: "editSeedRecord",
    extra: (p) => ({ onSaveAndNew: p.extras?.onSaveAndNew }),
  }),
  customerGroups: crud(CustomerGroupDrawer, "customerGroupId", { numeric: true }),
  customers: crud(CustomerDrawer, "customerId"),
  salesInvoices: crud(SalesInvoiceDrawer, "invoiceId", { createSeed: true }),
  purchaseInvoices: crud(PurchaseInvoiceDrawer, "invoiceId", { createSeed: true }),
  invoiceVerifiers: crud(InvoiceVerifierDrawer, "verifierId"),
  supplierGroups: crud(SupplierGroupDrawer, "supplierGroupId", { numeric: true }),
  suppliers: crud(SupplierDrawer, "supplierId"),
  branches: crud(BranchDrawer, "branchId", { numeric: true }),
  users: crud(UserDrawer, "userId", { seedKey: "editSeedRecord" }),
  roles: crud(RoleDrawer, "roleId", { numeric: true, seedKey: "editSeedRecord" }),
  stockAdjustmentReasons: crud(AdjustmentReasonDrawer, "reasonId", { numeric: true }),
  stockPurchaseOrders: crud(PurchaseOrderDrawer, "orderId", { createSeed: true }),
  stockGoodsReceipts: crud(GoodsReceiptDrawer, "receiptId", {
    extra: (p) => ({
      fromPurchaseOrderId:
        p.mode === "create" && typeof p.extras?.fromPurchaseOrderId === "string"
          ? p.extras.fromPurchaseOrderId
          : null,
    }),
  }),
  stockOpeningStocks: crud(OpeningStockDrawer, "documentId"),
  stockAdjustments: crud(StockAdjustmentDocumentDrawer, "documentId", { createSeed: true }),
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
      onCreatePo: typeof p.extras?.onCreatePo === "function" ? p.extras.onCreatePo : undefined,
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
          movementId: parseNumericEntityId(p.recordId) ?? normalizeEntityId(p.recordId),
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
  return lookupDrawerRegistration(DRAWER_REGISTRY, featureId);
}

/**
 * @param {string} featureId
 * @param {GlobalDrawerRenderProps} input
 * @returns {{ Component: import("react").ComponentType<Record<string, unknown>>, props: Record<string, unknown> } | null}
 */
export function renderRegisteredDrawer(featureId, input) {
  return renderDrawerFromRegistry(DRAWER_REGISTRY, featureId, input);
}
