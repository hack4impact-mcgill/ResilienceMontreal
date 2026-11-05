"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import {
  DetailFields,
  DetailNotes,
  useAuditFields,
} from "@/components/detail-page";
import {
  DetailPanel,
  type DetailPanelControls,
  mutationErrorMessage,
} from "@/components/detail-panel";
import { api, type RouterInputs } from "~/trpc/react";
import { type GrantDraft, grantDraftFrom, grantFields } from "./grant-fields";

type UpdateGrantPayload = RouterInputs["grant"]["update"];

export function GrantPanel({
  id,
  ...controls
}: { id: number } & DetailPanelControls) {
  const { onClose } = controls;
  const t = useTranslations("common");
  const utils = api.useUtils();
  const {
    data: grant,
    isLoading,
    error: loadError,
  } = api.grant.getById.useQuery({ id }, { retry: false });
  const { data: fundPools } = api.fundPool.getAll.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const auditFields = useAuditFields(grant);

  const [draft, setDraftRaw] = React.useState<GrantDraft | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const setDraft = (patch: Partial<GrantDraft>) =>
    setDraftRaw((prev) => (prev ? { ...prev, ...patch } : prev));

  // same queries the grants table refreshes after a delete
  const invalidate = () =>
    Promise.all([
      utils.grant.getGrants.invalidate(),
      utils.grant.getById.invalidate({ id }),
      utils.fundPool.getAll.invalidate(),
      utils.fundPool.getTotalFunding.invalidate(),
      utils.fundPool.getUncategorized.invalidate(),
    ]);

  const update = api.grant.update.useMutation({
    onSuccess: async () => {
      await invalidate();
      setDraftRaw(null);
    },
    onError: (err) => setError(mutationErrorMessage(err)),
  });

  const remove = api.grant.delete.useMutation({
    onSuccess: async () => {
      onClose();
      await invalidate();
    },
    onError: (err) => setError(mutationErrorMessage(err)),
  });

  const save = () => {
    if (!grant || !draft) return;
    const initial = grantDraftFrom(grant);
    // Send only what changed: any amount or fund pool in the payload takes
    // grant.update's money-moving path, which rejects grants split over pools.
    const payload: UpdateGrantPayload = { id };
    const changed = (key: keyof GrantDraft) => draft[key] !== initial[key];

    if (changed("organization")) payload.organization = draft.organization;
    if (changed("fundPoolId") && draft.fundPoolId) {
      const pool = fundPools?.find((p) => p.id === Number(draft.fundPoolId));
      if (pool) {
        payload.fundPoolId = pool.id;
        payload.category = pool.category;
      }
    }
    if (changed("dateReceived"))
      payload.dateReceived = new Date(draft.dateReceived);
    if (changed("toBeUsedBy")) payload.toBeUsedBy = new Date(draft.toBeUsedBy);
    if (changed("email")) payload.email = draft.email;
    if (changed("phoneNumber")) payload.phoneNumber = draft.phoneNumber;
    if (changed("notes")) payload.notes = draft.notes;
    if (Number(draft.amount) !== Number(initial.amount))
      payload.amount = Number(draft.amount);

    setError(null);
    if (Object.keys(payload).length === 1) {
      setDraftRaw(null);
      return;
    }
    update.mutate(payload);
  };

  const edit = draft
    ? { draft, setDraft, fundPools: fundPools ?? [] }
    : undefined;
  const { fields, notes } = grant
    ? grantFields(grant, edit)
    : { fields: [], notes: undefined };

  return (
    <DetailPanel
      title={t("grant")}
      pageHref={`/grants/${id}`}
      {...controls}
      isLoading={isLoading}
      loadError={loadError?.message}
      editing={draft !== null}
      onEdit={() => {
        if (grant) setDraftRaw(grantDraftFrom(grant));
        setError(null);
      }}
      onCancelEdit={() => {
        setDraftRaw(null);
        setError(null);
      }}
      onSave={save}
      isSaving={update.isPending}
      error={error}
      onDelete={() => {
        setError(null);
        remove.mutate({ id });
      }}
      isDeleting={remove.isPending}
      deleteName={grant?.title}
      notes={
        notes && (
          <DetailNotes
            label={notes.label}
            value={notes.value}
            input={notes.input}
            editing={draft !== null}
          />
        )
      }
    >
      <DetailFields
        fields={[...fields, ...auditFields]}
        editing={draft !== null}
        className="lg:grid-cols-2"
      />
    </DetailPanel>
  );
}
