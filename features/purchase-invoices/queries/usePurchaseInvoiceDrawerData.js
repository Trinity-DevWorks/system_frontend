import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { fetchItemNames, fetchItemUoms } from "@/features/items/index";
import { fetchSupplierNames } from "@/features/suppliers/index";
import { fetchCurrencyNames } from "@/features/currencies/index";
import { fetchPaymentTermNames } from "@/features/payment-terms/index";
import { formatItemOptionLabel } from "@/features/items/utils/formatItemLabel";
import { ITEMS_LIST_QUERY_KEY } from "@/features/items";
import { SUPPLIERS_LIST_QUERY_KEY } from "@/features/suppliers";
import { CURRENCIES_LIST_QUERY_KEY } from "@/features/currencies";
import { PAYMENT_TERMS_LIST_QUERY_KEY } from "@/features/payment-terms";
import { isPersistedEntityId } from "@/lib/entityId";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { PI_BASE_UOM } from "../utils/purchaseInvoiceDrawerUtils";

/**
 * @param {{
 *   open: boolean;
 *   loadCatalogs?: boolean;
 *   t: (key: string) => string;
 * }} args
 */
export function usePurchaseInvoiceDrawerData({ open, loadCatalogs = false, t }) {
  const suppliersQuery = useQuery({
    queryKey: SUPPLIERS_LIST_QUERY_KEY,
    queryFn: fetchSupplierNames,
    enabled: open && loadCatalogs,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const currenciesQuery = useQuery({
    queryKey: CURRENCIES_LIST_QUERY_KEY,
    queryFn: fetchCurrencyNames,
    enabled: open && loadCatalogs,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const paymentTermsQuery = useQuery({
    queryKey: PAYMENT_TERMS_LIST_QUERY_KEY,
    queryFn: fetchPaymentTermNames,
    enabled: open && loadCatalogs,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const itemsQuery = useQuery({
    queryKey: ITEMS_LIST_QUERY_KEY,
    queryFn: fetchItemNames,
    enabled: open && loadCatalogs,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const supplierOptions = useMemo(
    () =>
      (suppliersQuery.data ?? [])
        .filter((s) => s?.is_active !== false)
        .map((s) => {
          const code = typeof s.supplier_code === "string" ? s.supplier_code.trim() : "";
          const name = String(s.name ?? s.id);
          return {
            value: s.id,
            label: code ? `${code} — ${name}` : name,
          };
        }),
    [suppliersQuery.data],
  );

  const currencyOptions = useMemo(
    () =>
      (currenciesQuery.data ?? [])
        .filter((c) => c?.is_active !== false)
        .map((c) => ({
          value: c.id,
          label: String(c.code ?? c.name ?? c.id),
        })),
    [currenciesQuery.data],
  );

  const paymentTermOptions = useMemo(
    () =>
      (paymentTermsQuery.data ?? [])
        .filter((term) => term?.is_active !== false)
        .map((term) => ({
          value: term.id,
          label: String(term.name ?? term.code ?? term.id),
        })),
    [paymentTermsQuery.data],
  );

  const itemOptions = useMemo(
    () =>
      (itemsQuery.data ?? [])
        .filter((row) => row?.allow_purchase !== false && row?.is_active !== false)
        .map((row) => ({
          value: row.id,
          label: formatItemOptionLabel(row),
        })),
    [itemsQuery.data],
  );

  return {
    supplierOptions,
    currencyOptions,
    paymentTermOptions,
    itemOptions,
    catalogsPending:
      (loadCatalogs && suppliersQuery.isPending) ||
      (loadCatalogs && currenciesQuery.isPending) ||
      (loadCatalogs && paymentTermsQuery.isPending) ||
      (loadCatalogs && itemsQuery.isPending),
    t,
  };
}

/**
 * @param {{
 *   itemId?: string;
 *   t: (key: string) => string;
 *   enabled?: boolean;
 * }} args
 */
export function usePurchaseInvoiceLineUomOptions({ itemId, t, enabled = true }) {
  const query = useQuery({
    queryKey: [...ITEMS_LIST_QUERY_KEY, itemId, "uoms"],
    queryFn: () => fetchItemUoms(/** @type {string} */ (itemId)),
    enabled: enabled && isPersistedEntityId(itemId),
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const options = useMemo(() => {
    const rows = Array.isArray(query.data) ? query.data : [];
    return [
      { value: PI_BASE_UOM, label: t("baseUomOption") },
      ...rows.map((row) => ({
        value: row.id,
        label:
          typeof row.uom?.code === "string"
            ? row.uom.code
            : typeof row.uom?.name === "string"
              ? row.uom.name
              : String(row.id),
      })),
    ];
  }, [query.data, t]);

  return { options, pending: query.isPending };
}
