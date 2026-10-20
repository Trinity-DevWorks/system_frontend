"use client";

import PartyLedgerPage from "@/features/party-ledger/components/PartyLedgerPage";
import { customerLedgerConfig } from "../customerLedgerConfig";

export default function CustomerLedgerPage() {
  return <PartyLedgerPage config={customerLedgerConfig} />;
}
