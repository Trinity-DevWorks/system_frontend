"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useResourceAccess, PERMISSIONS_QUERY_KEY } from "@/lib/permissions";
import { isOwnerRoleName } from "../roles/drawer/roleDrawerUtils";
import { fetchPermissions } from "@/services/permissionsApi";
import {
  fetchPermissionRoles,
  fetchRolePermissions,
  updateRolePermissions,
} from "@/services/rolesApi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  App,
  Button,
  Input,
  Select,
  Space,
  Spin,
  Typography,
} from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import PermissionMatrixTable from "./PermissionMatrixTable";
import {
  areMatrixRowsEqual,
  buildMatrixRows,
  cloneMatrixRows,
  matrixRowsToPayload,
  pickDefaultRoleId,
} from "./permissionsMatrixUtils";

export default function PermissionsPage() {
  const t = useTranslations("PermissionsPage");
  const tApiErrors = useTranslations("ApiErrors");
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const access = useResourceAccess("permissions");

  /** null = use default role from the loaded list */
  const [selectedRoleId, setSelectedRoleId] = useState(/** @type {number | null} */ (null));
  /** null = show server matrix; non-null = local edits */
  const [draftRows, setDraftRows] = useState(
    /** @type {Array<Record<string, unknown>> | null} */ (null),
  );
  const [search, setSearch] = useState("");

  const rolesQuery = useQuery({
    queryKey: ["tenant", "permissions", "roles"],
    queryFn: fetchPermissionRoles,
    staleTime: 5 * 60_000,
  });

  const catalogQuery = useQuery({
    queryKey: ["tenant", "permissions", "catalog"],
    queryFn: fetchPermissions,
    staleTime: 5 * 60_000,
  });

  const roles = useMemo(
    () => (Array.isArray(rolesQuery.data) ? rolesQuery.data : []),
    [rolesQuery.data],
  );

  const catalog = useMemo(
    () => (Array.isArray(catalogQuery.data) ? catalogQuery.data : []),
    [catalogQuery.data],
  );

  const activeRoleId = useMemo(() => {
    if (selectedRoleId != null) return selectedRoleId;
    return pickDefaultRoleId(roles);
  }, [selectedRoleId, roles]);

  const roleDetailQuery = useQuery({
    queryKey: ["tenant", "permissions", "role", activeRoleId],
    queryFn: () => fetchRolePermissions(/** @type {number} */ (activeRoleId)),
    enabled: activeRoleId != null,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  const selectedRole = useMemo(
    () => roles.find((r) => Number(r?.id) === Number(activeRoleId)) ?? null,
    [roles, activeRoleId],
  );

  const ownerSelected = isOwnerRoleName(selectedRole?.name);
  const readOnly = !access.canEdit || ownerSelected;

  const serverMatrix = useMemo(() => {
    if (!catalog.length || activeRoleId == null || !roleDetailQuery.data) {
      return [];
    }
    const rolePerms = /** @type {Record<string, unknown>} */ (roleDetailQuery.data)
      .permissions;
    return buildMatrixRows(catalog, Array.isArray(rolePerms) ? rolePerms : []);
  }, [catalog, activeRoleId, roleDetailQuery.data]);

  const matrixRows = draftRows ?? serverMatrix;
  const isDirty = useMemo(
    () => draftRows != null && !areMatrixRowsEqual(draftRows, serverMatrix),
    [draftRows, serverMatrix],
  );

  const saveMutation = useMutation({
    mutationFn: () =>
      updateRolePermissions(
        /** @type {number} */ (activeRoleId),
        matrixRowsToPayload(matrixRows),
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(["tenant", "permissions", "role", activeRoleId], data);
      queryClient.invalidateQueries({ queryKey: ["tenant", "roles"] });
      queryClient.invalidateQueries({ queryKey: PERMISSIONS_QUERY_KEY });
      setDraftRows(null);
      message.success(t("saveSuccess"));
    },
    onError: (err) => {
      message.error(getLocalizedApiErrorMessage(tApiErrors, err) || t("saveError"));
    },
  });

  const commitRoleChange = useCallback((id) => {
    setSelectedRoleId(id);
    setDraftRows(null);
  }, []);

  const requestRoleChange = useCallback(
    (nextId) => {
      const id = Number(nextId);
      if (!Number.isFinite(id) || id === activeRoleId) return;

      if (!isDirty) {
        commitRoleChange(id);
        return;
      }

      modal.confirm({
        title: t("unsavedTitle"),
        content: t("unsavedSwitchContent"),
        okText: t("unsavedDiscard"),
        cancelText: t("unsavedStay"),
        onOk: () => {
          commitRoleChange(id);
        },
      });
    },
    [activeRoleId, commitRoleChange, isDirty, modal, t],
  );

  const handleDiscard = useCallback(() => {
    if (!isDirty) return;
    modal.confirm({
      title: t("unsavedTitle"),
      content: t("unsavedDiscardContent"),
      okText: t("unsavedDiscard"),
      cancelText: t("unsavedStay"),
      onOk: () => {
        setDraftRows(null);
      },
    });
  }, [isDirty, modal, t]);

  const handleMatrixChange = useCallback((next) => {
    setDraftRows(cloneMatrixRows(next));
  }, []);

  const roleOptions = useMemo(
    () =>
      roles.map((r) => {
        const id = Number(r.id);
        const name = String(r.name ?? id);
        const inactive = r.is_active === false;
        const owner = isOwnerRoleName(name);
        let label = name;
        if (owner) label = `${name} (${t("roleOwnerBadge")})`;
        else if (inactive) label = `${name} (${t("roleInactiveBadge")})`;
        return { value: id, label };
      }),
    [roles, t],
  );

  const bootLoading =
    (rolesQuery.isPending && !rolesQuery.data) ||
    (catalogQuery.isPending && !catalogQuery.data);

  const detailLoading =
    activeRoleId != null && roleDetailQuery.isPending && !roleDetailQuery.data;

  useEffect(() => {
    if (rolesQuery.isError && rolesQuery.error) {
      message.error(
        getLocalizedApiErrorMessage(tApiErrors, rolesQuery.error) || t("loadError"),
      );
    }
  }, [rolesQuery.isError, rolesQuery.error, message, t, tApiErrors]);

  useEffect(() => {
    if (catalogQuery.isError && catalogQuery.error) {
      message.error(
        getLocalizedApiErrorMessage(tApiErrors, catalogQuery.error) || t("loadError"),
      );
    }
  }, [catalogQuery.isError, catalogQuery.error, message, t, tApiErrors]);

  useEffect(() => {
    if (roleDetailQuery.isError && roleDetailQuery.error) {
      message.error(
        getLocalizedApiErrorMessage(tApiErrors, roleDetailQuery.error) ||
          t("loadRoleError"),
      );
    }
  }, [roleDetailQuery.isError, roleDetailQuery.error, message, t, tApiErrors]);

  if (bootLoading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <Spin size="large" description={t("loading")} />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 p-4">
      {!access.canEdit ? (
        <Alert type="info" showIcon title={t("readOnlyHint")} />
      ) : null}
      {ownerSelected ? (
        <Alert type="warning" showIcon title={t("ownerLockedHint")} />
      ) : null}

      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Typography.Text className="whitespace-nowrap">{t("roleLabel")}</Typography.Text>
          <Select
            className="min-w-[14rem]"
            showSearch
            optionFilterProp="label"
            options={roleOptions}
            value={activeRoleId ?? undefined}
            placeholder={t("rolePlaceholder")}
            onChange={requestRoleChange}
            disabled={saveMutation.isPending}
          />
        </div>
        <Input.Search
          className="max-w-xs min-w-[12rem] flex-1"
          allowClear
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {isDirty ? (
          <Typography.Text type="warning" className="text-sm">
            {t("unsavedBadge")}
          </Typography.Text>
        ) : null}
        <Space wrap className="ms-auto">
          <Button onClick={handleDiscard} disabled={!isDirty || readOnly || saveMutation.isPending}>
            {t("discard")}
          </Button>
          <Button
            type="primary"
            onClick={() => saveMutation.mutate()}
            disabled={!isDirty || readOnly || activeRoleId == null}
            loading={saveMutation.isPending}
          >
            {t("save")}
          </Button>
        </Space>
      </div>

      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-lg border border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)]">
        {detailLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Spin description={t("loadingRole")} />
          </div>
        ) : (
          <PermissionMatrixTable
            rows={matrixRows}
            readOnly={readOnly}
            search={search}
            onChange={handleMatrixChange}
            t={t}
          />
        )}
      </div>
    </div>
  );
}
