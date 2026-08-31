"use client";

import ResourceDrawerFieldLabel from "@/shared/components/resource-drawer/ResourceDrawerFieldLabel";
import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import { formatTenantMoney } from "@/lib/tenant-format";
import ItemVariantBarcodesSection from "./ItemVariantBarcodesSection";
import { CheckOutlined, CloseOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { Button, Checkbox, Radio, Select, Tooltip, Typography } from "antd";
import { UOM_DRAFT_ROW_ID } from "./uomsPanelConstants";

/**
 * @param {Record<string, unknown>} values
 * @param {(key: string) => string} t
 * @param {string} currencyLabel
 */
function VariantPricingGrid({ values, t, currencyLabel }) {
  const price = (v) => formatTenantMoney(v) || "—";
  const cells = [
    { label: t("uomColCurrency"), value: currencyLabel },
    { label: t("uomFieldSell"), value: price(values.selling_price) },
    { label: t("uomFieldCost"), value: price(values.cost_price) },
    { label: t("uomColTakeaway"), value: price(values.takeaway_price) },
    { label: t("uomColDineIn"), value: price(values.dine_in_price) },
    { label: t("uomColDelivery"), value: price(values.delivery_price) },
  ];

  return (
    <dl className="m-0 grid grid-cols-3 gap-x-6 gap-y-[18px] border-b border-[var(--ant-color-border-secondary)] px-5 py-[18px] max-sm:grid-cols-2 max-[420px]:grid-cols-1">
      {cells.map((cell) => (
        <div key={cell.label} className="flex min-w-0 flex-col gap-1">
          <dt className="m-0 text-xs leading-snug text-[var(--ant-color-text-tertiary)]">{cell.label}</dt>
          <dd className="m-0 text-[15px] font-semibold tabular-nums leading-snug text-[var(--ant-color-text)]">
            {cell.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

const configOptionClass =
  "inline-flex cursor-pointer select-none items-center gap-2 text-sm text-[var(--ant-color-text)] [&_.ant-checkbox-disabled+span]:text-[var(--ant-color-text-secondary)] [&_.ant-radio-disabled+span]:text-[var(--ant-color-text-secondary)]";

const variantFormGridClass =
  "grid grid-cols-3 gap-x-6 gap-y-4 max-sm:grid-cols-2 max-[420px]:grid-cols-1";

/**
 * @param {{ label: string; required?: boolean; children: import("react").ReactNode }} props
 */
function VariantFormField({ label, required, children }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <ResourceDrawerFieldLabel text={label} required={required} />
      {children}
    </div>
  );
}

/**
 * @param {{
 *   itemId: number;
 *   row: Record<string, unknown>;
 *   isEditing: boolean;
 *   isNew: boolean;
 *   forceBaseUnit?: boolean;
 *   readOnly: boolean;
 *   values: import("../itemDrawerPanelsState").UomInlineValues;
 *   uomOptions: { value: number; label: string }[];
 *   currencyOptions: { value: number; label: string }[];
 *   uomsQueryPending?: boolean;
 *   currenciesQueryPending?: boolean;
 *   barcodes: unknown[];
 *   savePending?: boolean;
 *   patchPending?: boolean;
 *   inlineBlocked?: boolean;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   onPatch: (patch: Partial<import("../itemDrawerPanelsState").UomInlineValues>) => void;
 *   onSave: () => void;
 *   onCancel: () => void;
 *   onEdit: () => void;
 *   onDelete: () => void;
 *   onPatchFlag: (body: Record<string, unknown>) => void;
 * }} props
 */
export default function ItemVariantCard({
  itemId,
  row,
  isEditing,
  isNew,
  forceBaseUnit = false,
  readOnly,
  values,
  uomOptions,
  currencyOptions,
  uomsQueryPending,
  currenciesQueryPending,
  barcodes,
  savePending,
  patchPending,
  inlineBlocked,
  t,
  tApiErrors,
  onPatch,
  onSave,
  onCancel,
  onEdit,
  onDelete,
  onPatchFlag,
}) {
  const uom = /** @type {{ name?: string; code?: string } | undefined} */ (row.uom);
  const uomName = uom?.name ?? "";
  const uomCode = uom?.code ?? "";
  const uomLabel =
    uomName && uomCode && uomName.toUpperCase() !== uomCode.toUpperCase()
      ? `${uomName} (${uomCode})`
      : uomName || uomCode || (isNew ? (forceBaseUnit ? t("variantCardNewBaseTitle") : t("variantCardNewTitle")) : "—");
  const currency = /** @type {{ code?: string; name?: string } | undefined} */ (row.currency);
  const currencyLabel = currency?.code ?? currency?.name ?? "—";
  const rowId = Number(row.id);
  const isPersisted = !isNew && rowId > 0 && row.id !== UOM_DRAFT_ROW_ID;
  const flagsDisabled = readOnly || inlineBlocked || isEditing;
  const canDelete = isPersisted && !row.is_base;

  const deleteButton = (
    <Button
      type="link"
      size="small"
      danger
      className="!px-1 font-medium"
      icon={<DeleteOutlined />}
      disabled={inlineBlocked || row.is_base || savePending}
      onClick={onDelete}
    >
      {t("actionDelete")}
    </Button>
  );

  const displayValues = isEditing
    ? values
    : {
        selling_price: row.selling_price,
        cost_price: row.cost_price,
        takeaway_price: row.takeaway_price,
        dine_in_price: row.dine_in_price,
        delivery_price: row.delivery_price,
      };

  return (
    <article
      className={[
        "overflow-hidden rounded-xl border border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)]",
        isEditing ? "border-[var(--ant-color-primary-border)] shadow-[0_0_0_1px_var(--ant-color-primary-border)]" : "",
        isNew ? "border-dashed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="flex items-start justify-between gap-3 border-b border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)] px-[18px] py-3.5">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <span className="text-[15px] font-semibold leading-snug text-[var(--ant-color-text)]">
            {isEditing && isNew ? t("variantCardNewTitle") : uomLabel}
          </span>
          {!isEditing ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {row.is_base ? (
                <span className="inline-flex items-center rounded-full bg-[var(--ant-color-success-bg)] px-2.5 py-0.5 text-xs font-medium leading-5 text-[var(--ant-color-success)]">
                  {t("uomFlagBase")}
                </span>
              ) : null}
              {row.is_default_sale ? (
                <span className="inline-flex items-center rounded-full bg-[var(--ant-color-fill-quaternary)] px-2.5 py-0.5 text-xs font-medium leading-5 text-[var(--ant-color-text-secondary)]">
                  {t("uomFlagSale")}
                </span>
              ) : null}
              {row.is_default_purchase ? (
                <span className="inline-flex items-center rounded-full bg-[var(--ant-color-fill-quaternary)] px-2.5 py-0.5 text-xs font-medium leading-5 text-[var(--ant-color-text-secondary)]">
                  {t("uomFlagPurchase")}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        {!readOnly ? (
          <div className="flex shrink-0 items-center gap-1">
            {isEditing ? (
              <>
                <Button
                  type="primary"
                  size="small"
                  icon={<CheckOutlined />}
                  loading={savePending}
                  onClick={onSave}
                >
                  {t("variantCardSave")}
                </Button>
                <Button size="small" icon={<CloseOutlined />} disabled={savePending} onClick={onCancel}>
                  {t("uomInlineCancel")}
                </Button>
                {canDelete ? deleteButton : null}
              </>
            ) : (
              <>
                <Button
                  type="link"
                  size="small"
                  className="!px-1 font-medium"
                  icon={<EditOutlined />}
                  disabled={inlineBlocked}
                  onClick={onEdit}
                >
                  {t("actionEdit")}
                </Button>
                {row.is_base ? (
                  <Tooltip title={t("uomDeleteBaseForbidden")}>
                    <span className="inline-flex">{deleteButton}</span>
                  </Tooltip>
                ) : (
                  deleteButton
                )}
              </>
            )}
          </div>
        ) : null}
      </header>

      <div className="p-0">
        {isEditing ? (
          <div className="item-general-form border-b border-[var(--ant-color-border-secondary)] px-5 pb-4 pt-4">
            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-x-6">
              <VariantFormField label={t("uomFieldUom")} required>
                <Select
                  className="w-full"
                  showSearch
                  optionFilterProp="label"
                  placeholder={t("uomFieldUom")}
                  value={values.uom_id}
                  disabled={!isNew}
                  options={uomOptions}
                  loading={uomsQueryPending}
                  onChange={(v) => onPatch({ uom_id: v })}
                  getPopupContainer={drawerSelectGetPopup}
                />
              </VariantFormField>
              <VariantFormField label={t("uomFieldCurrency")}>
                <Select
                  className="w-full"
                  allowClear
                  placeholder={t("uomFieldCurrency")}
                  value={values.currency_id}
                  options={currencyOptions}
                  loading={currenciesQueryPending}
                  onChange={(v) => onPatch({ currency_id: v ?? undefined })}
                  getPopupContainer={drawerSelectGetPopup}
                />
              </VariantFormField>
            </div>

            <div className={variantFormGridClass}>
              <VariantFormField label={t("uomFieldFactor")}>
                <TenantNumberInput
                  kind="quantity"
                  className="!w-full"
                  style={{ width: "100%" }}
                  min={0.000001}
                  step={0.01}
                  value={values.conversion_factor}
                  disabled={values.is_base || forceBaseUnit}
                  onChange={(v) => onPatch({ conversion_factor: Number(v ?? 1) })}
                />
              </VariantFormField>
              <VariantFormField label={t("uomFieldSell")}>
                <TenantNumberInput
                  kind="money"
                  className="!w-full"
                  style={{ width: "100%" }}
                  min={0}
                  value={values.selling_price}
                  onChange={(v) => onPatch({ selling_price: v ?? undefined })}
                />
              </VariantFormField>
              <VariantFormField label={t("uomFieldCost")}>
                <TenantNumberInput
                  kind="money"
                  className="!w-full"
                  style={{ width: "100%" }}
                  min={0}
                  value={values.cost_price}
                  onChange={(v) => onPatch({ cost_price: v ?? undefined })}
                />
              </VariantFormField>
              <VariantFormField label={t("uomColTakeaway")}>
                <TenantNumberInput
                  kind="money"
                  className="!w-full"
                  style={{ width: "100%" }}
                  min={0}
                  value={values.takeaway_price}
                  onChange={(v) => onPatch({ takeaway_price: v ?? undefined })}
                />
              </VariantFormField>
              <VariantFormField label={t("uomColDineIn")}>
                <TenantNumberInput
                  kind="money"
                  className="!w-full"
                  style={{ width: "100%" }}
                  min={0}
                  value={values.dine_in_price}
                  onChange={(v) => onPatch({ dine_in_price: v ?? undefined })}
                />
              </VariantFormField>
              <VariantFormField label={t("uomColDelivery")}>
                <TenantNumberInput
                  kind="money"
                  className="!w-full"
                  style={{ width: "100%" }}
                  min={0}
                  value={values.delivery_price}
                  onChange={(v) => onPatch({ delivery_price: v ?? undefined })}
                />
              </VariantFormField>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-7 gap-y-5 border-t border-[var(--ant-color-border-secondary)] px-0.5 pt-3.5">
              {!forceBaseUnit ? (
                <label className={configOptionClass}>
                  <Checkbox
                    checked={values.is_base}
                    onChange={(e) =>
                      onPatch({
                        is_base: e.target.checked,
                        conversion_factor: e.target.checked ? 1 : values.conversion_factor,
                      })
                    }
                  />
                  {t("uomColBase")}
                </label>
              ) : null}
              <label className={configOptionClass}>
                <Checkbox
                  checked={values.is_default_sale}
                  onChange={(e) => onPatch({ is_default_sale: e.target.checked })}
                />
                {t("uomColDefaultSale")}
              </label>
              <label className={configOptionClass}>
                <Checkbox
                  checked={values.is_default_purchase}
                  onChange={(e) => onPatch({ is_default_purchase: e.target.checked })}
                />
                {t("uomColDefaultPurchase")}
              </label>
            </div>
          </div>
        ) : (
          <>
            <VariantPricingGrid t={t} currencyLabel={currencyLabel} values={displayValues} />
            <div className="flex flex-wrap items-center gap-x-7 gap-y-5 border-b border-[var(--ant-color-border-secondary)] px-5 py-3.5">
              <label className={configOptionClass}>
                <Radio
                  checked={Boolean(row.is_base)}
                  disabled={flagsDisabled}
                  onChange={() => onPatchFlag({ is_base: true })}
                />
                {t("uomColBase")}
              </label>
              <label className={configOptionClass}>
                <Checkbox
                  checked={Boolean(row.is_default_sale)}
                  disabled={flagsDisabled}
                  onChange={(e) => onPatchFlag({ is_default_sale: e.target.checked })}
                />
                {t("uomColDefaultSale")}
              </label>
              <label className={configOptionClass}>
                <Checkbox
                  checked={Boolean(row.is_default_purchase)}
                  disabled={flagsDisabled}
                  onChange={(e) => onPatchFlag({ is_default_purchase: e.target.checked })}
                />
                {t("uomColDefaultPurchase")}
              </label>
            </div>
          </>
        )}

        {isPersisted ? (
          <ItemVariantBarcodesSection
            itemId={itemId}
            itemUomId={rowId}
            barcodes={barcodes}
            readOnly={readOnly}
            t={t}
            tApiErrors={tApiErrors}
          />
        ) : isEditing && isNew ? (
          <Typography.Text type="secondary" className="block px-5 pb-[18px] pt-3.5 text-[13px]">
            {t("variantBarcodesAfterSave")}
          </Typography.Text>
        ) : null}
      </div>
    </article>
  );
}
