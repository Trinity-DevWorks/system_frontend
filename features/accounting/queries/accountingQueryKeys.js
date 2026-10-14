export const ACCOUNTS_QUERY_KEY = /** @type {const} */ (["tenant", "accounts"]);
export const ACCOUNT_TREE_QUERY_KEY = /** @type {const} */ ([...ACCOUNTS_QUERY_KEY, "tree"]);
export const ACCOUNT_DETAIL_QUERY_PREFIX = /** @type {const} */ ([...ACCOUNTS_QUERY_KEY, "detail"]);
export const POSTABLE_ACCOUNTS_QUERY_KEY = /** @type {const} */ ([...ACCOUNTS_QUERY_KEY, "postable"]);
export const ACCOUNT_MAPPINGS_QUERY_KEY = /** @type {const} */ (["tenant", "account-mappings"]);
export const JOURNAL_ENTRIES_QUERY_KEY = /** @type {const} */ (["tenant", "journal-entries"]);
export const JOURNAL_ENTRY_DETAIL_QUERY_PREFIX = /** @type {const} */ ([...JOURNAL_ENTRIES_QUERY_KEY, "detail"]);
export const ACCOUNTING_REPORTS_QUERY_KEY = /** @type {const} */ (["tenant", "accounting-reports"]);
