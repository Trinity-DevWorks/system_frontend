"use client";

/**
 * Units & pricing tab — UOM cards with per-UOM pricing and barcodes.
 *
 * Used by:
 * - drawer/panels/ItemDrawerPanels.js (barrel)
 * - drawer/hooks/useItemDrawerTabItems.js (via barrel)
 */

import ResourceDrawerPanelHeader from "@/shared/components/resource-drawer/ResourceDrawerPanelHeader";
import { InfoCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { Alert, Button, Empty, Spin, Tooltip } from "antd";
import ItemVariantCard from "./ItemVariantCard";
import { useItemUomsPanel } from "./useItemUomsPanel";
import { UOM_DRAFT_ROW_ID } from "./uomsPanelConstants";

/**
 * @param {{
 *   itemId: number;
 *   unitGroupId?: number;
 *   readOnly: boolean;
 *   t: (k: string, values?: Record<string, unknown>) => string;
 *   tApiErrors: (k: string) => string;
 *   active: boolean;
 *   queryEnabled?: boolean;
 * }} props
 */
export function ItemUomsPanel({ itemId, unitGroupId, readOnly, t, tApiErrors, active, queryEnabled = false }) {
  const panel = useItemUomsPanel({
    itemId,
    unitGroupId,
    readOnly,
    t,
    tApiErrors,
    active,
    queryEnabled,
  });

  const {
    isPending,
    variantCards,
    allBarcodes,
    orphanBarcodes,
    inlineEdit,
    baseRow,
    baseUnitLabel,
    needsBaseUnit,
    resolvedUnitGroupId,
    addDisabledReason,
    uomOptions,
    currencyOptions,
    uomsQueryPending,
    currenciesQueryPending,
    saveMutationPending,
    patchMutationPending,
    startCreateRow,
    patchDraft,
    saveInline,
    cancelInline,
    startEditRow,
    patchFlag,
    requestDelete,
    getCardState,
  } = panel;

  const inlineBlocked = Boolean(inlineEdit);
  const addDisabled = readOnly || inlineBlocked || Boolean(addDisabledReason);
  const addLabel = needsBaseUnit ? t("variantCardAddBase") : t("variantCardAdd");

  return (
    <section>
      <ResourceDrawerPanelHeader
        title={t("tabUoms")}
        description={t("tabUomsDescription")}
        actions={
          !readOnly ? (
            <Tooltip title={addDisabledReason ?? undefined}>
              <span className="inline-block">
                <Button
                  type="primary"
                  ghost
                  icon={<PlusOutlined />}
                  disabled={addDisabled}
                  onClick={startCreateRow}
                >
                  {addLabel}
                </Button>
              </span>
            </Tooltip>
          ) : null
        }
      />

      {!resolvedUnitGroupId ? (
        <Alert type="info" showIcon className="!mb-4" title={t("uomUnitGroupRequiredHint")} />
      ) : needsBaseUnit ? (
        <Alert type="info" showIcon className="!mb-4" title={t("uomBaseUnitFirstHint")} />
      ) : (
        <Alert
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          className="!mb-4"
          title={t("uomConversionHint", { baseUnit: baseUnitLabel })}
        />
      )}

      {orphanBarcodes.length > 0 ? (
        <Alert
          type="warning"
          showIcon
          className="!mb-4"
          title={t("variantBarcodesOrphanWarning", { count: orphanBarcodes.length })}
        />
      ) : null}

      {isPending ? (
        <div className="flex justify-center py-12">
          <Spin />
        </div>
      ) : variantCards.length === 0 && !inlineEdit ? (
        <Empty description={t("variantCardsEmpty")} className="!my-8" />
      ) : (
        <div className="flex flex-col gap-4">
          {variantCards.map((row) => {
            const { isEditing, isNew, values } = getCardState(row);
            const cardKey = row.id === UOM_DRAFT_ROW_ID ? UOM_DRAFT_ROW_ID : String(row.id);
            const forceBaseUnit = isNew && needsBaseUnit;

            return (
              <ItemVariantCard
                key={cardKey}
                itemId={itemId}
                row={row}
                isEditing={isEditing}
                isNew={isNew}
                forceBaseUnit={forceBaseUnit}
                readOnly={readOnly}
                values={values}
                uomOptions={uomOptions}
                currencyOptions={currencyOptions}
                uomsQueryPending={uomsQueryPending}
                currenciesQueryPending={currenciesQueryPending}
                barcodes={allBarcodes}
                savePending={saveMutationPending}
                patchPending={patchMutationPending}
                inlineBlocked={inlineBlocked && !isEditing}
                t={t}
                tApiErrors={tApiErrors}
                onPatch={patchDraft}
                onSave={saveInline}
                onCancel={cancelInline}
                onEdit={() => startEditRow(row)}
                onDelete={() => requestDelete(row)}
                onPatchFlag={(body) => patchFlag(Number(row.id), body)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
