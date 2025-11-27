"use client";

import { useEffect, useState } from "react";
import { api } from "~/trpc/react";
import { TRPCClientError } from "@trpc/client";

const getFriendlyError = (err: unknown) => {
  if (err instanceof TRPCClientError) {
    const zodError: any = (err as any)?.data?.zodError;
    if (zodError?.fieldErrors) {
      const fields: Record<string, string[]> = zodError.fieldErrors;
      const messages: string[] = [];
      for (const key of Object.keys(fields)) {
        const first = fields[key]?.[0];
        if (!first) continue;
        switch (key) {
          case "description":
            messages.push("Missing required fields: description");
            break;
          case "date":
            messages.push("Invalid input: date must be a valid date");
            break;
          case "totalAmount":
            messages.push("Invalid input: totalAmount must be a number");
            break;
          case "invoiceUrl":
            messages.push("Invalid input: invoiceUrl must be a valid URL");
            break;
          default:
            messages.push(first);
        }
      }
      if (messages.length > 0) return messages.join(". ");
    }
    return err.message ?? "Something went wrong";
  }
  if (err && typeof err === "object" && "message" in err) {
    return (err as any).message ?? "Something went wrong";
  }
  return "Something went wrong";
};

type Expense = {
  id: number;
  totalAmount: string | number;
  description: string;
  date: string;
  invoiceUrl?: string | null;
};

export default function ExpensesPage() {
  const [totalAmount, setTotalAmount] = useState("");
  const [description, setDescription] = useState("");
  // Initialize date after mount to avoid SSR/client mismatch
  const [date, setDate] = useState<string>("");
  const [invoiceUrl, setInvoiceUrl] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const {
    data: listData,
    isLoading: loadingList,
    refetch: refetchExpenses,
  } = api.expenses.list.useQuery({ page: 1, limit: 10 });

  useEffect(() => {
    // Only load existing expenses; do not prefill form values so backend validation is exercised
    // Data loads via tRPC useQuery
  }, []);

  const handleCreate = async () => {
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      await createExpense.mutateAsync({
        totalAmount: totalAmount,
        description,
        date,
        invoiceUrl: invoiceUrl || undefined,
      });
      setMessage("Expense created");
      setTotalAmount("");
      setDescription("");
      // Leave date empty to avoid client-side defaults
      setDate("");
      setInvoiceUrl("");
      await refetchExpenses();
    } catch (e: any) {
      setError(getFriendlyError(e));
    } finally {
      setSubmitting(false);
    }
  };

  const createExpense = api.expenses.create.useMutation();

  const createSample = async () => {
    setError(null);
    setMessage(null);
    const sampleAmount = "12.34";
    const sampleDescription = "Sample expense";
    const sampleDateStr = new Date().toISOString().slice(0, 10);
    const sampleInvoice = "";

    setSubmitting(true);
    try {
      await createExpense.mutateAsync({
        totalAmount: sampleAmount,
        description: sampleDescription,
        date: sampleDateStr,
        invoiceUrl: undefined,
      });
      // reflect in UI
      setTotalAmount("");
      setDescription("");
      setDate("");
      setInvoiceUrl(sampleInvoice);
      setMessage("Expense created");
      await refetchExpenses();
    } catch (e: any) {
      setError(getFriendlyError(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Expenses</h1>
        <p className="text-sm text-gray-500">Create a new expense and view recent ones.</p>
      </div>

      <div className="max-w-md space-y-3 border rounded-md p-4">
        <h2 className="font-medium">Create Expense</h2>
        <div className="space-y-2">
          <label className="block text-sm">Total Amount</label>
          <input
            type="text"
            placeholder="e.g. 123.45 (or try invalid to test backend)"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm">Description</label>
          <input
            type="text"
            placeholder="What is this for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm">Invoice URL (optional)</label>
          <input
            type="url"
            placeholder="https://..."
            value={invoiceUrl}
            onChange={(e) => setInvoiceUrl(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCreate}
            disabled={submitting}
            className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Expense"}
          </button>
          <button
            onClick={createSample}
            disabled={submitting}
            className="border px-4 py-2 rounded"
          >
            Quick sample
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-600">{message}</p>}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Recent expenses</h2>
          <button onClick={() => refetchExpenses()} className="text-sm underline" disabled={loadingList}>
            {loadingList ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        <div className="border rounded-md divide-y">
          {(listData?.expenses?.length ?? 0) === 0 && (
            <div className="p-4 text-sm text-gray-500">No expenses yet.</div>
          )}
          {listData?.expenses?.map((e) => (
            <div key={e.id} className="p-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-medium">{e.description}</div>
                {/* Use a stable, timezone-agnostic format to avoid SSR/client mismatches */}
                <div className="text-xs text-gray-500">{new Date(e.date).toISOString().slice(0, 10)}</div>
                {e.invoiceUrl && (
                  <a href={e.invoiceUrl} target="_blank" rel="noreferrer" className="text-xs underline text-blue-600">
                    Invoice
                  </a>
                )}
              </div>
              <div className="font-mono">${Number(e.totalAmount).toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
