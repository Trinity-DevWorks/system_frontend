"use client";

import { Alert, Button } from "antd";

/**
 * Shown when line prices were set at a different exchange rate than the header.
 * Floats over the bottom of the lines panel. Nothing reprices until the user clicks the button.
 *
 * @param {{
 *   count: number;
 *   manualCount: number;
 *   disabled?: boolean;
 *   t: (key: string, values?: Record<string, unknown>) => string;
 *   onUpdate: () => void;
 * }} props
 */
export default function LinePriceRateBanner({ count, manualCount, disabled, t, onUpdate }) {
  if (count <= 0) return null;
  const message = t("lineRateUpdateBanner", { count });
  return (
    <div className="line-price-rate-banner">
      <Alert
        type="warning"
        showIcon
        title={manualCount > 0 ? `${message} ${t("lineRateUpdateManualKept", { count: manualCount })}` : message}
        action={
          <Button size="small" type="primary" disabled={disabled} onClick={onUpdate}>
            {t("lineRateUpdateAction")}
          </Button>
        }
      />
    </div>
  );
}
