import StockModuleTabs from "./StockModuleTabs";

/**
 * Shared chrome for all Stock sub-routes (balances, movements, transfers).
 */
export default function StockLayout({ children }) {
  return <StockModuleTabs>{children}</StockModuleTabs>;
}
