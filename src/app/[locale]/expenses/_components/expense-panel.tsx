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
import {
  type ExpenseDraft,
  expenseDraftFrom,
  expenseFields,
} from "./expense-fields";

type UpdateExpensePayload = RouterInputs["expenses"]["update"];

export function ExpensePanel({
  id,
  ...controls
}: { id: number } & DetailPanelControls) {
  const { onClose } = controls;
  const t = useTranslations("common");
  const utils = api.useUtils();
  const {
    data: expense,
    isLoading,
    error: loadError,
  } = api.expenses.getById.useQuery({ id }, { retry: false });
  // expenses have no created/edited timestamps yet, so these all show "—"
  const auditFields = useAuditFields();

  const [draft, setDraftRaw] = React.useState<ExpenseDraft | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const setDraft = (patch: Partial<ExpenseDraft>) =>
    setDraftRaw((prev) => (prev ? { ...prev, ...patch } : prev));

  const update = api.expenses.update.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.expenses.list.invalidate(),
        utils.expenses.getById.invalidate({ id }),
      ]);
      setDraftRaw(null);
    },
    onError: (err) => setError(mutationErrorMessage(err)),
  });

  // deleting gives the amounts back to the grants, so their totals change too
  const remove = api.expenses.delete.useMutation({
    onSuccess: async () => {
      onClose();
      await Promise.all([
        utils.expenses.list.invalidate(),
        utils.grant.getGrants.invalidate(),
        utils.grant.getById.invalidate(),
        utils.fundPool.getAll.invalidate(),
        utils.clients.getClients.invalidate(),
      ]);
    },
    onError: (err) => setError(mutationErrorMessage(err)),
  });

  const save = () => {
    if (!expense || !draft) return;
    const initial = expenseDraftFrom(expense);
    const payload: UpdateExpensePayload = { id };
    if (draft.description !== initial.description)
      payload.description = draft.description;
    if (draft.date !== initial.date) payload.date = new Date(draft.date);
    if (draft.invoiceUrl !== initial.invoiceUrl)
      payload.invoiceUrl = draft.invoiceUrl.trim() || null;

    setError(null);
    if (Object.keys(payload).length === 1) {
      setDraftRaw(null);
      return;
    }
    update.mutate(payload);
  };

  // same roles the backend allows to edit and delete (Bookkeeper, Admin)
  const canEdit = expense?.canEditAllocations ?? false;
  const edit = draft ? { draft, setDraft } : undefined;
  const { fields, notes } = expense
    ? expenseFields(expense, edit)
    : { fields: [], notes: undefined };

  return (
    <DetailPanel
      title={t("expense")}
      pageHref={`/expenses/${id}`}
      {...controls}
      isLoading={isLoading}
      loadError={loadError?.message}
      editing={draft !== null}
      canEdit={canEdit}
      onEdit={() => {
        if (expense) setDraftRaw(expenseDraftFrom(expense));
        setError(null);
      }}
      onCancelEdit={() => {
        setDraftRaw(null);
        setError(null);
      }}
      onSave={save}
      isSaving={update.isPending}
      error={error}
      canDelete={canEdit}
      onDelete={() => {
        setError(null);
        remove.mutate({ id });
      }}
      isDeleting={remove.isPending}
      deleteName="this expense"
      deleteDescription="Its amounts will be given back to the grants it was charged to."
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
