/**
 * Shared chrome for all Stock sub-routes (balances, movements, transfers).
 *
 * Sub-route navigation lives in the shell sidebar panel, so this only frames the body.
 */
export default function StockLayout({ children }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
  );
}
