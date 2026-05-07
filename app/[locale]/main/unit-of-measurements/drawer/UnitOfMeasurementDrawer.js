"use client";

import ResourceCrudDrawer from "@/components/resource-drawer/ResourceCrudDrawer";
import ResourceDrawerFooter from "@/components/resource-drawer/ResourceDrawerFooter";
import { useResourceDrawerCloseFlow } from "@/components/resource-drawer/useResourceDrawerCloseFlow";
import { useResourceDrawerDetailSync } from "@/components/resource-drawer/useResourceDrawerDetailSync";
import { usePersistedSaveIntent } from "@/lib/drawer/persistedSaveIntent";
import { fetchUnitGroups } from "@/services/unitGroupsApi";
import { fetchUnitOfMeasurement } from "@/services/unitOfMeasurementsApi";
import { useQuery } from "@tanstack/react-query";
import { App, Form } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import UnitOfMeasurementDrawerForm from "./UnitOfMeasurementDrawerForm";
import {
  UOM_CREATE_SAVE_INTENT_EVENT,
  UOM_CREATE_SAVE_INTENT_KEY,
  isCreateDirtyVsDefaults,
  isEditDirtyVsLoaded,
  requiredFieldsValid,
  toUnitOfMeasurementCacheRow,
} from "./unitOfMeasurementDrawerUtils";
import { useUnitOfMeasurementDrawerMutations } from "./useUnitOfMeasurementDrawerMutations";

const UOM_DETAIL_QUERY_PREFIX = /** @type {const} */ (["tenant", "unit-of-measurements"]);

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   unitOfMeasurementId: number | null;
 *   tableSeedRecord?: Record<string, unknown> | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 * }} props
 */
export default function UnitOfMeasurementDrawer({
  open,
  mode,
  unitOfMeasurementId,
  tableSeedRecord = null,
  onClose,
  onCreated,
}) {
  const t = useTranslations("UnitOfMeasurements");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const lastCreateIntent = usePersistedSaveIntent(UOM_CREATE_SAVE_INTENT_KEY, UOM_CREATE_SAVE_INTENT_EVENT);

  const readOnly = mode === "view";

  const defaults = useMemo(
    () => ({
      unit_group_id: undefined,
      code: "",
      name: "",
      symbol: "",
      decimal_places: 2,
      is_active: true,
    }),
    [],
  );

  const mapSeedToCacheRow = useCallback((seed) => toUnitOfMeasurementCacheRow(seed), []);
  const mapRecordToFormValues = useCallback(
    (r) => ({
      unit_group_id: r.unit_group_id,
      code: r.code,
      name: r.name,
      symbol: r.symbol ?? "",
      decimal_places: Number(r.decimal_places ?? 0),
      is_active: Boolean(r.is_active),
    }),
    [],
  );

  const { detailEnabled, tableSeedMatches, fetchRemoteDetail, detailQuery } = useResourceDrawerDetailSync({
    open,
    mode,
    recordId: unitOfMeasurementId,
    tableSeedRecord,
    form,
    defaults,
    queryKeyPrefix: UOM_DETAIL_QUERY_PREFIX,
    fetchDetail: fetchUnitOfMeasurement,
    mapSeedToCacheRow,
    mapRecordToFormValues,
  });

  const unitGroupsQuery = useQuery({
    queryKey: ["tenant", "unit-groups"],
    queryFn: () => fetchUnitGroups(),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const unitGroupOptions = useMemo(() => {
    const rows = unitGroupsQuery.data;
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => ({
      value: row.id,
      label: `${row.name ?? row.id}${row.code ? ` (${row.code})` : ""}`,
    }));
  }, [unitGroupsQuery.data]);

  const unitGroupIdWatch = Form.useWatch("unit_group_id", form);
  const codeWatch = Form.useWatch("code", form);
  const nameWatch = Form.useWatch("name", form);
  const decimalPlacesWatch = Form.useWatch("decimal_places", form);

  const canSubmitRequired = useMemo(() => {
    const groupId =
      typeof unitGroupIdWatch === "number"
        ? unitGroupIdWatch
        : unitGroupIdWatch != null
          ? Number(unitGroupIdWatch)
          : undefined;
    const code = typeof codeWatch === "string" ? codeWatch : "";
    const name = typeof nameWatch === "string" ? nameWatch : "";
    return requiredFieldsValid(groupId, code, name, decimalPlacesWatch);
  }, [unitGroupIdWatch, codeWatch, nameWatch, decimalPlacesWatch]);

  const unitGroupsData = Array.isArray(unitGroupsQuery.data) ? unitGroupsQuery.data : undefined;

  const { createMutation, updateMutation, applyPayload, submitting } = useUnitOfMeasurementDrawerMutations({
    form,
    message,
    t,
    tApiErrors,
    onClose,
    onCreated,
    defaults,
    unitGroupsData,
  });

  const editBaselineForDirty = useMemo(() => {
    if (mode !== "edit") return null;
    if (detailQuery.data) return /** @type {Record<string, unknown>} */ (detailQuery.data);
    if (tableSeedMatches && tableSeedRecord) {
      return toUnitOfMeasurementCacheRow(/** @type {Record<string, unknown>} */ (tableSeedRecord));
    }
    return null;
  }, [mode, detailQuery.data, tableSeedMatches, tableSeedRecord]);

  const shouldConfirmDiscard = useCallback(() => {
    if (readOnly) return false;
    if (mode === "create") return isCreateDirtyVsDefaults(form, defaults);
    if (mode === "edit" && editBaselineForDirty) {
      return isEditDirtyVsLoaded(form, editBaselineForDirty);
    }
    if (mode === "edit") return form.isFieldsTouched(true);
    return false;
  }, [readOnly, mode, form, defaults, editBaselineForDirty]);

  const { forceClose, requestClose } = useResourceDrawerCloseFlow({
    readOnly,
    modal,
    t,
    onClose,
    shouldConfirmDiscard,
  });

  const runCreate = useCallback(
    (intent) => {
      form
        .validateFields()
        .then((values) => {
          const payload = applyPayload(values);
          createMutation.mutate({ payload, intent });
        })
        .catch(() => {});
    },
    [form, applyPayload, createMutation],
  );

  const handleEditSubmit = useCallback(() => {
    if (readOnly) return;
    form
      .validateFields()
      .then((values) => {
        const payload = applyPayload(values);
        if (mode === "edit" && unitOfMeasurementId != null) {
          updateMutation.mutate({ id: unitOfMeasurementId, values: payload });
        }
      })
      .catch(() => {});
  }, [readOnly, form, applyPayload, mode, unitOfMeasurementId, updateMutation]);

  const title =
    mode === "create" ? t("drawerTitleCreate") : mode === "view" ? t("drawerTitleView") : t("drawerTitleEdit");

  const showDetailLoading = fetchRemoteDetail && detailQuery.isPending;

  const createSaveDisabled =
    !canSubmitRequired ||
    submitting ||
    (mode === "create" && unitGroupsQuery.isError) ||
    (fetchRemoteDetail && detailEnabled && detailQuery.isError);

  const createIntentLabel = useCallback(
    (/** @type {import("@/lib/drawer/persistedSaveIntent").DrawerSaveIntent} */ intent) => {
      if (intent === "keep") return t("drawerSave");
      if (intent === "new") return t("drawerSaveAndNew");
      return t("drawerSaveAndClose");
    },
    [t],
  );

  const createSaveMenuItems = useMemo(() => {
    /** @type {import("@/lib/drawer/persistedSaveIntent").DrawerSaveIntent[]} */
    const all = ["keep", "new", "close"];
    return all
      .filter((key) => key !== lastCreateIntent)
      .map((key) => ({
        key,
        label: createIntentLabel(key),
      }));
  }, [lastCreateIntent, createIntentLabel]);

  return (
    <ResourceCrudDrawer
      title={title}
      open={open}
      requestClose={requestClose}
      submitting={submitting}
      showDetailLoading={showDetailLoading}
      detailLoadFailed={Boolean(fetchRemoteDetail && detailEnabled && detailQuery.isError)}
      detailError={detailQuery.error}
      tApiErrors={tApiErrors}
      skeletonParagraphRows={5}
      footer={
        <ResourceDrawerFooter
          mode={mode}
          readOnly={readOnly}
          t={t}
          forceClose={forceClose}
          requestClose={requestClose}
          submitting={submitting}
          createSaveDisabled={createSaveDisabled}
          lastCreateIntent={lastCreateIntent}
          runCreate={runCreate}
          createIntentLabel={createIntentLabel}
          createSaveMenuItems={createSaveMenuItems}
          handleEditSubmit={handleEditSubmit}
          canSubmitRequired={canSubmitRequired}
          fetchRemoteDetail={fetchRemoteDetail}
          detailEnabled={detailEnabled}
          detailQueryError={detailQuery.isError}
        />
      }
    >
      <UnitOfMeasurementDrawerForm
        form={form}
        readOnly={readOnly}
        t={t}
        tApiErrors={tApiErrors}
        unitGroupOptions={unitGroupOptions}
        unitGroupsPending={unitGroupsQuery.isPending}
        unitGroupsError={unitGroupsQuery.isError ? unitGroupsQuery.error : null}
      />
    </ResourceCrudDrawer>
  );
}
