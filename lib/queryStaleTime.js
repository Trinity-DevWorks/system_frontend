/**
 * Shared React Query stale / garbage-collection times.
 *
 * Inbox and ledgers refetch more often; catalogs stay warm; host config is
 * infinite until an explicit invalidate.
 */

export const QUERY_STALE_TIME = {
  inbox: 15_000,
  ledger: 30_000,
  default: 60_000,
  items: 2 * 60_000,
  catalog: 5 * 60_000,
  lookup: 10 * 60_000,
  infinite: Number.POSITIVE_INFINITY,
};

export const QUERY_GC_TIME = 5 * 60_000;
