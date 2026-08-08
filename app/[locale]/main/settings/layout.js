import SettingsWorkspace from "./SettingsWorkspace";

/**
 * Shared chrome for all Settings sub-routes (company profile, company settings).
 */
export default function SettingsLayout({ children }) {
  return <SettingsWorkspace>{children}</SettingsWorkspace>;
}
