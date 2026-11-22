"use client";

import { useGlobalDrawer } from "@/lib/drawer/GlobalDrawerContext";
import { useQuery } from "@tanstack/react-query";
import { Button, Typography } from "antd";
import { useTranslations } from "next-intl";
import { fetchFixedAssets } from "../api/fixedAssets.api";

/**
 * Assets created when a purchase invoice was posted. Opens each asset on top of the invoice drawer.
 *
 * @param {{ invoiceId: string }} props
 */
export default function InvoiceFixedAssets({ invoiceId }) {
  const t = useTranslations("FixedAssets");
  const { openStackedDrawer } = useGlobalDrawer();
  const query = useQuery({
    queryKey: ["tenant", "fixed-assets", "invoice", invoiceId],
    queryFn: () => fetchFixedAssets({ purchase_invoice_id: invoiceId, per_page: 100 }),
    enabled: Boolean(invoiceId),
  });
  const rows = query.data?.rows ?? [];
  if (!rows.length) return null;

  return (
    <div className="mt-4">
      <Typography.Text type="secondary">{t("fromInvoice")}</Typography.Text>
      <div className="mt-2 flex flex-wrap gap-2">
        {rows.map((row) => (
          <Button key={String(row.id)} size="small" onClick={() => openStackedDrawer({ featureId: "fixedAssets", id: String(row.id), mode: "view" })}>
            {row.asset_number || row.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
