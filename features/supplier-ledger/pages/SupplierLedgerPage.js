"use client";

import PartyLedgerPage from "@/features/party-ledger/components/PartyLedgerPage";
import { supplierLedgerConfig } from "../supplierLedgerConfig";

export default function SupplierLedgerPage() {
  return <PartyLedgerPage config={supplierLedgerConfig} />;
}
