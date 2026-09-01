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
import PurchaseInvoiceDrawer from "@/features/purchase-invoices/components/PurchaseInvoiceDrawer/PurchaseInvoiceDrawer";
import UnitGroupDrawer from "@/features/unit-groups/components/UnitGroupDrawer/UnitGroupDrawer";
import UnitOfMeasurementDrawer from "@/features/unit-of-measurements/components/UnitOfMeasurementDrawer/UnitOfMeasurementDrawer";
import UserDrawer from "@/features/users/components/UserDrawer/UserDrawer";
import VatGroupDrawer from "@/features/vat-groups/components/VatGroupDrawer/VatGroupDrawer";
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
  supplierGroups: crud(SupplierGroupDrawer, "supplierGroupId", { numeric: true }),
  suppliers: crud(SupplierDrawer, "supplierId"),
  purchaseInvoices: crud(PurchaseInvoiceDrawer, "invoiceId"),
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
  return { Component: registration.Component, props: registration.mapProps(input) };
}
