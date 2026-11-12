"use client";

import * as React from "react";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TableErrorState } from "@/components/data-table/TableErrorState";
import { TableLoadingState } from "@/components/data-table/TableLoadingState";
import { api } from "~/trpc/react";

type Mode = "view" | "edit" | "delete";

type ClientFormData = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  landlordName: string;
  leaseStart: string;
  leaseEnd: string;
  notes: string;
  workerId: string;
};

const EMPTY_FORM: ClientFormData = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  email: "",
  phone: "",
  landlordName: "",
  leaseStart: "",
  leaseEnd: "",
  notes: "",
  workerId: "",
};

const clientFormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  email: z.union([z.literal(""), z.email("Invalid email address")]),
  phone: z.string(),
  landlordName: z.string(),
  leaseStart: z.string(),
  leaseEnd: z.string(),
  notes: z.string(),
  workerId: z.string().min(1, "Intervention worker is required"),
});

const toDateInputValue = (value: Date | string | null | undefined) =>
  value ? new Date(value).toISOString().slice(0, 10) : "";

const formatDateOnly = (value: Date | string | null | undefined) =>
  value
    ? new Date(value).toLocaleDateString(undefined, { timeZone: "UTC" })
    : "—";

const toOptionalDate = (value: string) =>
  value ? new Date(`${value}T12:00:00`) : null;

export function ClientProfileModal({
  clientId,
  open,
  onOpenChange,
}: {
  clientId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const utils = api.useUtils();
  const [mode, setMode] = React.useState<Mode>("view");
  const [form, setForm] = React.useState<ClientFormData>(EMPTY_FORM);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const {
    data: client,
    isLoading,
    isError,
    error,
  } = api.clients.getById.useQuery(
    { id: clientId ?? 0 },
    {
      enabled: open && clientId !== null,
      retry: false,
      refetchOnWindowFocus: false,
    },
  );

  const { data: workers } = api.clients.listWorkers.useQuery(undefined, {
    enabled: open,
  });

  const editClient = api.clients.editClient.useMutation();
  const deleteClient = api.clients.deleteClient.useMutation();

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && (editClient.isPending || deleteClient.isPending)) return;
    if (!nextOpen) {
      setMode("view");
      setErrors({});
    }
    onOpenChange(nextOpen);
  };

  const startEdit = () => {
    if (!client) return;
    setForm({
      firstName: client.firstName,
      lastName: client.lastName,
      dateOfBirth: toDateInputValue(client.dateOfBirth),
      email: client.email ?? "",
      phone: client.phone ?? "",
      landlordName: client.landlordName ?? "",
      leaseStart: toDateInputValue(client.leaseStart),
      leaseEnd: toDateInputValue(client.leaseEnd),
      notes: client.notes ?? "",
      workerId: client.workerId,
    });
    setErrors({});
    setMode("edit");
  };

  const handleSave = () => {
    if (!client) return;

    const result = clientFormSchema.safeParse(form);
    if (!result.success) {
      const nextErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0];
        if (field) nextErrors[String(field)] = issue.message;
      });
      setErrors(nextErrors);
      return;
    }

    editClient.mutate(
      {
        id: client.id,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        dateOfBirth: new Date(`${form.dateOfBirth}T12:00:00`),
        workerId: form.workerId,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        landlordName: form.landlordName.trim() || null,
        leaseStart: toOptionalDate(form.leaseStart),
        leaseEnd: toOptionalDate(form.leaseEnd),
        notes: form.notes.trim() || null,
      },
      {
        onSuccess: () => {
          void utils.clients.getClients.invalidate();
          void utils.clients.getById.invalidate({ id: client.id });
          toast.success("Client updated successfully!");
          setMode("view");
          setErrors({});
          onOpenChange(false);
        },
        onError: (mutationError) => {
          toast.error(
            mutationError.message ||
              "Failed to update client. Please try again.",
          );
        },
      },
    );
  };

  const handleDelete = () => {
    if (!client) return;

    deleteClient.mutate(
      { id: client.id },
      {
        onSuccess: () => {
          void utils.clients.getClients.invalidate();
          toast.success("Client deleted successfully!");
          setMode("view");
          setErrors({});
          onOpenChange(false);
        },
        onError: (mutationError) => {
          toast.error(
            mutationError.message ||
              "Failed to delete client. Please try again.",
          );
        },
      },
    );
  };

  const setField = (field: keyof ClientFormData, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    if (errors[field]) {
      setErrors((previous) => {
        const next = { ...previous };
        delete next[field];
        return next;
      });
    }
  };

  const currentWorkerMissing =
    client?.worker &&
    !workers?.some((worker) => worker.supabaseId === client.worker.supabaseId);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        {isLoading ? (
          <>
            <DialogTitle className="sr-only">Client details</DialogTitle>
            <TableLoadingState />
          </>
        ) : isError || !client ? (
          <>
            <DialogTitle className="sr-only">Client details</DialogTitle>
            <TableErrorState message={error?.message} />
          </>
        ) : mode === "edit" ? (
          <form
            className="flex flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              handleSave();
            }}
          >
            <DialogHeader>
              <DialogTitle>Edit client</DialogTitle>
              <DialogDescription>
                Update {client.firstName} {client.lastName}&apos;s details.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="First Name"
                htmlFor="client-first-name"
                error={errors.firstName}
              >
                <Input
                  id="client-first-name"
                  value={form.firstName}
                  onChange={(event) =>
                    setField("firstName", event.target.value)
                  }
                  className="bg-white"
                />
              </FormField>

              <FormField
                label="Last Name"
                htmlFor="client-last-name"
                error={errors.lastName}
              >
                <Input
                  id="client-last-name"
                  value={form.lastName}
                  onChange={(event) => setField("lastName", event.target.value)}
                  className="bg-white"
                />
              </FormField>

              <FormField
                label="Date of Birth"
                htmlFor="client-date-of-birth"
                error={errors.dateOfBirth}
              >
                <Input
                  id="client-date-of-birth"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(event) =>
                    setField("dateOfBirth", event.target.value)
                  }
                  className="bg-white"
                />
              </FormField>

              <FormField
                label="Email"
                htmlFor="client-email"
                error={errors.email}
              >
                <Input
                  id="client-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setField("email", event.target.value)}
                  className="bg-white"
                />
              </FormField>

              <FormField label="Phone Number" htmlFor="client-phone">
                <Input
                  id="client-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(event) => setField("phone", event.target.value)}
                  className="bg-white"
                />
              </FormField>

              <FormField label="Landlord" htmlFor="client-landlord">
                <Input
                  id="client-landlord"
                  value={form.landlordName}
                  onChange={(event) =>
                    setField("landlordName", event.target.value)
                  }
                  className="bg-white"
                />
              </FormField>

              <FormField label="Date Lease Signed" htmlFor="client-lease-start">
                <Input
                  id="client-lease-start"
                  type="date"
                  value={form.leaseStart}
                  onChange={(event) =>
                    setField("leaseStart", event.target.value)
                  }
                  className="bg-white"
                />
              </FormField>

              <FormField label="Date Lease Ends" htmlFor="client-lease-end">
                <Input
                  id="client-lease-end"
                  type="date"
                  value={form.leaseEnd}
                  onChange={(event) => setField("leaseEnd", event.target.value)}
                  className="bg-white"
                />
              </FormField>

              <FormField
                label="Intervention Worker"
                htmlFor="client-worker"
                error={errors.workerId}
              >
                <select
                  id="client-worker"
                  value={form.workerId}
                  onChange={(event) => setField("workerId", event.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-white px-2 text-sm"
                >
                  <option value="">Select worker</option>
                  {currentWorkerMissing && client.worker && (
                    <option value={client.worker.supabaseId}>
                      {client.worker.name}
                    </option>
                  )}
                  {workers?.map((worker) => (
                    <option key={worker.supabaseId} value={worker.supabaseId}>
                      {worker.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                label="Notes"
                htmlFor="client-notes"
                className="sm:col-span-2"
              >
                <Textarea
                  id="client-notes"
                  value={form.notes}
                  onChange={(event) => setField("notes", event.target.value)}
                  className="bg-white"
                  rows={4}
                />
              </FormField>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setMode("view");
                  setErrors({});
                }}
                disabled={editClient.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#45BAB8] text-white hover:bg-[#45BAB8]"
                disabled={editClient.isPending}
              >
                {editClient.isPending ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        ) : mode === "delete" ? (
          <>
            <DialogHeader>
              <DialogTitle>Delete client?</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {client.firstName}{" "}
                {client.lastName}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setMode("view")}
                disabled={deleteClient.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteClient.isPending}
              >
                {deleteClient.isPending ? "Deleting…" : "Delete client"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="flex flex-col gap-6">
            <DialogHeader className="pr-10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <DialogTitle className="text-3xl">
                  {client.firstName} {client.lastName}
                </DialogTitle>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-[#3FA9A9] text-[#3FA9A9] hover:bg-[#3FA9A9]/10"
                    onClick={startEdit}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-red-400 text-red-600 hover:bg-red-50"
                    onClick={() => setMode("delete")}
                  >
                    Delete
                  </Button>
                </div>
              </div>
              <DialogDescription className="sr-only">
                Client profile details
              </DialogDescription>
            </DialogHeader>

            <section className="flex flex-col gap-4 border-t pt-5">
              <h3 className="text-xl font-semibold">Personal Information</h3>
              <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                <ProfileField label="First Name" value={client.firstName} />
                <ProfileField label="Last Name" value={client.lastName} />
                <ProfileField
                  label="Date of Birth"
                  value={formatDateOnly(client.dateOfBirth)}
                />
                <ProfileField label="Email" value={client.email} />
                <ProfileField label="Phone Number" value={client.phone} />
                <ProfileField label="Landlord" value={client.landlordName} />
                <ProfileField
                  label="Intervention Worker"
                  value={client.worker?.name}
                />
                <ProfileField
                  label="Date Lease Signed"
                  value={formatDateOnly(client.leaseStart)}
                />
                <ProfileField
                  label="Date Lease Ends"
                  value={formatDateOnly(client.leaseEnd)}
                />
                <ProfileField
                  label="Notes"
                  value={client.notes}
                  className="sm:col-span-2"
                />
              </dl>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProfileField({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className ?? ""}`}>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="break-words">{value || "—"}</dd>
    </div>
  );
}

function FormField({
  label,
  htmlFor,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
