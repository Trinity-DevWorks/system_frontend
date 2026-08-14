import SettingsWorkspace from "./SettingsWorkspace";

/**
 * Shared chrome for all Settings sub-routes (company profile, company settings, preferences).
 */
export default function SettingsLayout({ children }) {
  return <SettingsWorkspace>{children}</SettingsWorkspace>;
}
